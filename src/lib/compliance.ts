// Dose-compliance mathematics.
//
// Everything here is derived from DoseComplianceLog rows + the Prescription
// rate fields, using the same definitions the Django backend will compute:
//
//   taken(w)          = # logs in window with was_taken = true
//   scheduled(w)      = # logs in window
//   adherence(w)      = taken(w) / scheduled(w)                       [PDC]
//   punctuality       = mean(|actual_time - scheduled_time|) minutes
//   onTimeRate(t)     = # doses within t minutes / taken               (t = 30)
//   streak            = consecutive taken doses, newest-first
//   trend             = OLS slope of daily adherence over the window
//   runoutDate        = now + current_pill_count / daily_dose_rate days
//   MPR               = total_dispensed_pills / (daily_dose_rate * daysElapsed)
//   risk              = weighted blend of adherence, punctuality, supply
//
// All functions are pure so they can be unit-tested and swapped for a
// server-computed payload later without touching the UI.

import type { DoseComplianceLog, Prescription } from "./api/types";

export const DAY_MS = 86_400_000;
/** A dose counts as "on time" inside this tolerance. */
export const ON_TIME_TOLERANCE_MIN = 30;

export interface ComplianceWindow {
  days: number;
  scheduled: number;
  taken: number;
  missed: number;
  /** Proportion of days covered — 0..1 (PDC). */
  adherence: number;
  /** Mean absolute deviation from the scheduled time, in minutes. */
  meanDelayMin: number;
  /** Median absolute deviation, in minutes (robust to outliers). */
  medianDelayMin: number;
  /** Standard deviation of delay, in minutes — dosing consistency. */
  delaySdMin: number;
  /** Share of taken doses inside ON_TIME_TOLERANCE_MIN. */
  onTimeRate: number;
  /** Consecutive taken doses counting back from the newest log. */
  currentStreak: number;
  /** Longest run of consecutive taken doses in the window. */
  longestStreak: number;
  /** OLS slope of daily adherence, in adherence-points per day. */
  trendPerDay: number;
  /** Per-day series, oldest → newest. */
  daily: DailyPoint[];
  /** Per-clock-slot breakdown, e.g. 08:00 / 13:00 / 18:00. */
  slots: SlotStat[];
}

export interface DailyPoint {
  date: string; // YYYY-MM-DD
  label: string; // Mon, Tue…
  scheduled: number;
  taken: number;
  adherence: number;
}

export interface SlotStat {
  slot: string; // HH:MM
  scheduled: number;
  taken: number;
  adherence: number;
  meanDelayMin: number;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const round = (n: number, dp = 1) => Math.round(n * 10 ** dp) / 10 ** dp;

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

function median(xs: number[]) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

function sd(xs: number[]) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

/** Ordinary-least-squares slope of y over x. */
export function slope(points: Array<{ x: number; y: number }>) {
  if (points.length < 2) return 0;
  const mx = mean(points.map((p) => p.x));
  const my = mean(points.map((p) => p.y));
  const num = points.reduce((a, p) => a + (p.x - mx) * (p.y - my), 0);
  const den = points.reduce((a, p) => a + (p.x - mx) ** 2, 0);
  return den === 0 ? 0 : num / den;
}

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const slotKey = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/** Signed minutes between the actual and scheduled time (negative = early). */
export function delayMinutes(log: DoseComplianceLog): number | null {
  if (!log.actual_time) return null;
  return (new Date(log.actual_time).getTime() - new Date(log.scheduled_time).getTime()) / 60_000;
}

/** Full statistical summary of a set of dose logs over the last `days` days. */
export function complianceWindow(
  logs: DoseComplianceLog[],
  days = 7,
  now = new Date(),
): ComplianceWindow {
  const cutoff = now.getTime() - days * DAY_MS;
  const window = logs
    .filter((l) => {
      const t = new Date(l.scheduled_time).getTime();
      return t >= cutoff && t <= now.getTime();
    })
    .sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time));

  const scheduled = window.length;
  const taken = window.filter((l) => l.was_taken).length;
  const delays = window
    .map(delayMinutes)
    .filter((d): d is number => d != null)
    .map(Math.abs);

  // --- daily series (fills empty days with zeroes so the chart has no gaps) ---
  const buckets = new Map<string, { scheduled: number; taken: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * DAY_MS);
    buckets.set(dayKey(d), { scheduled: 0, taken: 0 });
  }
  for (const l of window) {
    const k = dayKey(new Date(l.scheduled_time));
    const b = buckets.get(k);
    if (!b) continue;
    b.scheduled += 1;
    if (l.was_taken) b.taken += 1;
  }
  const daily: DailyPoint[] = [...buckets.entries()].map(([date, b]) => ({
    date,
    label: new Date(`${date}T00:00:00`).toLocaleDateString([], { weekday: "short" }),
    scheduled: b.scheduled,
    taken: b.taken,
    adherence: b.scheduled ? b.taken / b.scheduled : 0,
  }));

  // --- per-slot breakdown ---
  const slotMap = new Map<string, { scheduled: number; taken: number; delays: number[] }>();
  for (const l of window) {
    const k = slotKey(l.scheduled_time);
    const s = slotMap.get(k) ?? { scheduled: 0, taken: 0, delays: [] };
    s.scheduled += 1;
    if (l.was_taken) s.taken += 1;
    const d = delayMinutes(l);
    if (d != null) s.delays.push(Math.abs(d));
    slotMap.set(k, s);
  }
  const slots: SlotStat[] = [...slotMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([slot, s]) => ({
      slot,
      scheduled: s.scheduled,
      taken: s.taken,
      adherence: s.scheduled ? s.taken / s.scheduled : 0,
      meanDelayMin: round(mean(s.delays)),
    }));

  // --- streaks (newest-first for the current streak) ---
  let currentStreak = 0;
  for (let i = window.length - 1; i >= 0; i--) {
    if (window[i]!.was_taken) currentStreak += 1;
    else break;
  }
  let longestStreak = 0;
  let run = 0;
  for (const l of window) {
    run = l.was_taken ? run + 1 : 0;
    if (run > longestStreak) longestStreak = run;
  }

  const onTime = window.filter((l) => {
    const d = delayMinutes(l);
    return l.was_taken && d != null && Math.abs(d) <= ON_TIME_TOLERANCE_MIN;
  }).length;

  const trendPerDay = slope(
    daily.filter((d) => d.scheduled > 0).map((d, i) => ({ x: i, y: d.adherence })),
  );

  return {
    days,
    scheduled,
    taken,
    missed: scheduled - taken,
    adherence: scheduled ? taken / scheduled : 0,
    meanDelayMin: round(mean(delays)),
    medianDelayMin: round(median(delays)),
    delaySdMin: round(sd(delays)),
    onTimeRate: taken ? onTime / taken : 0,
    currentStreak,
    longestStreak,
    trendPerDay,
    daily,
    slots,
  };
}

// ---- Supply projections (mirror the Prescription @property maths) ----

export interface SupplyForecast {
  dailyRate: number;
  daysRemaining: number;
  /** ISO date the bottle empties at the prescribed rate. */
  runoutDate: string;
  /** ISO date the refill threshold is crossed. */
  refillDate: string;
  /** Fraction of the dispensed bottle still on hand, 0..1. */
  bottleFraction: number;
  /** Medication Possession Ratio: dispensed ÷ expected consumption. */
  mpr: number;
  /** Pills expected to be gone vs pills actually gone (positive = overuse). */
  consumptionVariance: number;
}

export function supplyForecast(p: Prescription, now = new Date()): SupplyForecast {
  const dailyRate = p.daily_dose_rate || 1;
  const daysRemaining = p.current_pill_count / dailyRate;
  const runout = new Date(now.getTime() + daysRemaining * DAY_MS);
  const refill = new Date(
    now.getTime() + Math.max(0, daysRemaining - p.refill_threshold_days) * DAY_MS,
  );
  const daysElapsed = Math.max(
    1,
    (now.getTime() - new Date(p.created_at).getTime()) / DAY_MS,
  );
  const expectedUsed = dailyRate * daysElapsed;
  const actualUsed = p.total_dispensed_pills - p.current_pill_count;

  return {
    dailyRate,
    daysRemaining: round(daysRemaining),
    runoutDate: runout.toISOString(),
    refillDate: refill.toISOString(),
    bottleFraction: clamp01(p.current_pill_count / (p.total_dispensed_pills || 1)),
    mpr: round(p.total_dispensed_pills / (expectedUsed || 1), 2),
    consumptionVariance: round(actualUsed - expectedUsed),
  };
}

// ---- Composite risk score ----

export type RiskBand = "on-track" | "watch" | "at-risk";

export interface ComplianceRisk {
  /** 0..100, higher is better. */
  score: number;
  band: RiskBand;
  label: string;
  drivers: string[];
}

/**
 * score = 60·adherence + 25·punctuality + 15·supply
 *   punctuality = 1 - min(1, meanDelay / 120min)
 *   supply      = min(1, daysRemaining / (2 · threshold))
 */
export function complianceRisk(
  w: ComplianceWindow,
  forecast?: SupplyForecast,
  thresholdDays = 5,
): ComplianceRisk {
  const punctuality = 1 - Math.min(1, w.meanDelayMin / 120);
  const supply = forecast
    ? Math.min(1, forecast.daysRemaining / Math.max(1, thresholdDays * 2))
    : 1;
  const score = Math.round(100 * (0.6 * w.adherence + 0.25 * punctuality + 0.15 * supply));

  const drivers: string[] = [];
  if (w.missed > 0) drivers.push(`${w.missed} missed dose${w.missed > 1 ? "s" : ""} in ${w.days}d`);
  if (w.meanDelayMin > ON_TIME_TOLERANCE_MIN)
    drivers.push(`doses taken ${Math.round(w.meanDelayMin)} min off schedule on average`);
  if (forecast && forecast.daysRemaining <= thresholdDays)
    drivers.push(`only ${forecast.daysRemaining} days of pills left`);
  if (w.trendPerDay < -0.02) drivers.push("adherence trending down");
  if (!drivers.length) drivers.push("Doses taken on schedule");

  const band: RiskBand = score >= 85 ? "on-track" : score >= 65 ? "watch" : "at-risk";
  return {
    score,
    band,
    label: band === "on-track" ? "On track" : band === "watch" ? "Needs watching" : "At risk",
    drivers,
  };
}

export const pct = (n: number) => `${Math.round(n * 100)}%`;
