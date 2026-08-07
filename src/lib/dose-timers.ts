// Client-side dose scheduling: turns each Prescription's `doses_per_day` into
// concrete clock times, then exposes the next occurrence plus countdown text.
// Mirrors the backend rate maths (pills_per_dose * doses_per_day).

import { doseTimes, type Prescription } from "./api/types";

export type ScheduledDose = {
  key: string;
  prescription: Prescription;
  at: Date;
  slot: string;
};

export function slotDate(slot: string, base: Date) {
  const [h, m] = slot.split(":").map(Number);
  const d = new Date(base);
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d;
}

/** Every dose occurrence for today and tomorrow, chronologically. */
export function buildSchedule(prescriptions: Prescription[], from = new Date()): ScheduledDose[] {
  const rows: ScheduledDose[] = [];
  for (const p of prescriptions) {
    for (const dayOffset of [0, 1]) {
      const base = new Date(from);
      base.setDate(base.getDate() + dayOffset);
      for (const slot of doseTimes(p)) {
        const at = slotDate(slot, base);
        rows.push({ key: `${p.id}-${at.toISOString()}`, prescription: p, at, slot });
      }
    }
  }
  return rows.sort((a, b) => a.at.getTime() - b.at.getTime());
}

export function upcomingDoses(prescriptions: Prescription[], from = new Date()) {
  return buildSchedule(prescriptions, from).filter((d) => d.at.getTime() > from.getTime());
}

export const fmtClock = (d: Date) =>
  d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });

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
