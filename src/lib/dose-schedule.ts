// Patient-set dose times (morning / afternoon / evening / night).
//
// Stored client-side so the reminders and countdowns work offline, and synced to
// the backend (`PATCH /api/dose-schedule/`) so the server can mirror the times
// the patient chose. Shape matches the DoseSchedule model fields 1:1, including
// the IANA `timezone` the wall-clock times belong to.

export type DoseSlotKey = "morning" | "afternoon" | "evening" | "night";

export interface DoseSchedule {
  morning_time: string;
  afternoon_time: string;
  evening_time: string;
  night_time: string;
  /** IANA timezone the times above are expressed in, e.g. "Africa/Harare". */
  timezone: string;
}

export const DEFAULT_DOSE_SCHEDULE: DoseSchedule = {
  morning_time: "08:00",
  afternoon_time: "13:00",
  evening_time: "18:00",
  night_time: "22:00",
  timezone: "Africa/Harare",
};

export const DOSE_SLOT_META: Array<{
  key: DoseSlotKey;
  field: "morning_time" | "afternoon_time" | "evening_time" | "night_time";
  label: string;
}> = [
  { key: "morning", field: "morning_time", label: "Morning" },
  { key: "afternoon", field: "afternoon_time", label: "Afternoon" },
  { key: "evening", field: "evening_time", label: "Evening" },
  { key: "night", field: "night_time", label: "Night" },
];

export const DOSE_TIME_FIELDS = DOSE_SLOT_META.map((m) => m.field);

const STORAGE_KEY = "neurotrack.doseSchedule";

const isTime = (v: unknown): v is string => typeof v === "string" && /^\d{2}:\d{2}$/.test(v);

let current: DoseSchedule = { ...DEFAULT_DOSE_SCHEDULE };
let hydrated = false;
const listeners = new Set<() => void>();

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<DoseSchedule>;
    const next = { ...DEFAULT_DOSE_SCHEDULE };
    for (const field of DOSE_TIME_FIELDS) if (isTime(parsed[field])) next[field] = parsed[field]!;
    if (typeof parsed.timezone === "string" && parsed.timezone) next.timezone = parsed.timezone;
    current = next;
  } catch {
    /* ignore malformed storage */
  }
}

export function getDoseSchedule(): DoseSchedule {
  hydrate();
  return current;
}

/** Ordered "HH:MM" strings — the slots a prescription's doses_per_day maps onto. */
export function getDoseSlots(): string[] {
  const s = getDoseSchedule();
  return DOSE_TIME_FIELDS.map((f) => s[f]);
}

export function getDoseTimeZone(): string {
  return getDoseSchedule().timezone;
}

export function setDoseSchedule(patch: Partial<DoseSchedule>) {
  hydrate();
  current = { ...current, ...patch };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
  return current;
}

export function subscribeDoseSchedule(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
