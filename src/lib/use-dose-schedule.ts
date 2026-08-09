import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  DEFAULT_DOSE_SCHEDULE,
  getDoseSchedule,
  setDoseSchedule,
  subscribeDoseSchedule,
  DOSE_TIME_FIELDS,
  type DoseSchedule,
} from "./dose-schedule";
import { getRemoteDoseSchedule, saveDoseSchedule } from "./api/client";
import { deviceTimeZone, isValidTimeZone } from "./tz";

export type SyncState = "idle" | "syncing" | "synced" | "offline";

/**
 * Live subscription to the patient's dose times + timezone, with retrying
 * backend sync. The server copy wins on first load (it is the record of truth
 * across devices); local edits are pushed back immediately.
 */
export function useDoseSchedule() {
  const schedule = useSyncExternalStore(
    subscribeDoseSchedule,
    getDoseSchedule,
    () => DEFAULT_DOSE_SCHEDULE,
  );
  const [sync, setSync] = useState<SyncState>("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // Reconcile with GET /api/dose-schedule once on mount.
  useEffect(() => {
    let cancelled = false;
    setSync("syncing");
    void getRemoteDoseSchedule()
      .then((remote) => {
        if (cancelled) return;
        const local = getDoseSchedule();
        const remoteChanged = DOSE_TIME_FIELDS.some((k) => remote[k] !== local[k]);
        const tzChanged = !!remote.timezone && remote.timezone !== local.timezone;
        if (remote.server_time) {
          // Server-stored times are authoritative across devices.
          if (remoteChanged || tzChanged) {
            setDoseSchedule({
              morning_time: remote.morning_time,
              afternoon_time: remote.afternoon_time,
              evening_time: remote.evening_time,
              night_time: remote.night_time,
              timezone: remote.timezone || local.timezone,
            });
          }
          setSync("synced");
          setLastSyncedAt(remote.server_time);
        } else {
          setSync("offline");
        }
      })
      .catch(() => !cancelled && setSync("offline"));
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback((patch: Partial<DoseSchedule>) => {
    const next = setDoseSchedule(patch);
    setSync("syncing");
    void saveDoseSchedule(next).then((res) => {
      if (res.server_time) {
        setSync("synced");
        setLastSyncedAt(res.server_time);
      } else {
        setSync("offline");
      }
    });
  }, []);

  const device = useMemo(() => deviceTimeZone(), []);
  const timezoneMismatch = isValidTimeZone(device) && device !== schedule.timezone;

  const useDeviceTimeZone = useCallback(() => update({ timezone: device }), [device, update]);

  return { schedule, update, sync, lastSyncedAt, deviceTimeZone: device, timezoneMismatch, useDeviceTimeZone };
}
