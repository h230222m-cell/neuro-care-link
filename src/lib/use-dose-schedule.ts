import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  DEFAULT_DOSE_SCHEDULE,
  getDoseSchedule,
  setDoseSchedule,
  subscribeDoseSchedule,
  type DoseSchedule,
} from "./dose-schedule";
import { getRemoteDoseSchedule, saveDoseSchedule } from "./api/client";

/** Live subscription to the patient's dose times, with backend sync on save. */
export function useDoseSchedule() {
  const schedule = useSyncExternalStore(
    subscribeDoseSchedule,
    getDoseSchedule,
    () => DEFAULT_DOSE_SCHEDULE,
  );

  // Reconcile with GET /api/dose-schedule once on mount (local wins if offline).
  useEffect(() => {
    let cancelled = false;
    void getRemoteDoseSchedule().then((remote) => {
      if (cancelled) return;
      const local = getDoseSchedule();
      const changed = (["morning_time", "afternoon_time", "evening_time", "night_time"] as const)
        .some((k) => remote[k] !== local[k]);
      if (changed) void saveDoseSchedule(local);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback((patch: Partial<DoseSchedule>) => {
    const next = setDoseSchedule(patch);
    void saveDoseSchedule(next);
  }, []);

  return { schedule, update };
}

