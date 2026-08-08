import { useCallback, useSyncExternalStore } from "react";
import {
  DEFAULT_DOSE_SCHEDULE,
  getDoseSchedule,
  setDoseSchedule,
  subscribeDoseSchedule,
  type DoseSchedule,
} from "./dose-schedule";
import { saveDoseSchedule } from "./api/client";

/** Live subscription to the patient's dose times, with backend sync on save. */
export function useDoseSchedule() {
  const schedule = useSyncExternalStore(
    subscribeDoseSchedule,
    getDoseSchedule,
    () => DEFAULT_DOSE_SCHEDULE,
  );

  const update = useCallback((patch: Partial<DoseSchedule>) => {
    const next = setDoseSchedule(patch);
    void saveDoseSchedule(next);
  }, []);

  return { schedule, update };
}
