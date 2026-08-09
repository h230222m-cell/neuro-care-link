// Client-side dose scheduling: turns each Prescription's `doses_per_day` into
// concrete instants using the patient's saved wall-clock times *and* timezone,
// then exposes the next occurrence plus countdown text.
// Mirrors the backend rate maths (pills_per_dose * doses_per_day).

import { doseTimes, type Prescription } from "./api/types";
import { getDoseTimeZone } from "./dose-schedule";
import { addZonedDays, fmtZonedClock, zonedSlotDate } from "./tz";

export type ScheduledDose = {
  key: string;
  prescription: Prescription;
  at: Date;
  slot: string;
};

/** Instant at which the wall clock reads `slot` on `base`'s day in the patient's zone. */
export function slotDate(slot: string, base: Date, timezone = getDoseTimeZone()) {
  return zonedSlotDate(slot, base, timezone);
}

/** Every dose occurrence for today and tomorrow, chronologically. */
export function buildSchedule(
  prescriptions: Prescription[],
  from = new Date(),
  timezone = getDoseTimeZone(),
): ScheduledDose[] {
  const rows: ScheduledDose[] = [];
  for (const p of prescriptions) {
    for (const dayOffset of [0, 1]) {
      const base = addZonedDays(from, dayOffset, timezone);
      for (const slot of doseTimes(p)) {
        const at = zonedSlotDate(slot, base, timezone);
        rows.push({ key: `${p.id}-${at.toISOString()}`, prescription: p, at, slot });
      }
    }
  }
  return rows.sort((a, b) => a.at.getTime() - b.at.getTime());
}

export function upcomingDoses(
  prescriptions: Prescription[],
  from = new Date(),
  timezone = getDoseTimeZone(),
) {
  return buildSchedule(prescriptions, from, timezone).filter(
    (d) => d.at.getTime() > from.getTime(),
  );
}

/** Wall clock in the patient's dose timezone — "08:00". */
export const fmtClock = (d: Date, timezone = getDoseTimeZone()) => fmtZonedClock(d, timezone);

/** "2h 14m 08s" style countdown, clamped at zero. */
export function countdown(to: Date, from = new Date()) {
  const ms = Math.max(0, to.getTime() - from.getTime());
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return { h, m, s, text: h > 0 ? `${h}h ${pad(m)}m` : `${m}m ${pad(s)}s`, done: ms === 0 };
}
