// Longitudinal monitoring engine (decision-support only).
//
// Compares each patient against THEIR OWN baseline — never a population — and
// fuses voice, falls, adherence and pill supply into a review level.
// Mirrors the planned Django CDSS rules so the backend can replace it 1:1.

export type RiskLevel = "stable" | "routine" | "critical";

export const BASELINE_MIN_DAYS = 3; // cold-start baseline
export const BASELINE_MAX_DAYS = 14; // rolling window
export const REFILL_THRESHOLD_DAYS = 3;
export const SUSTAINED_WINDOW = 3; // days averaged to ignore one-day blips

export const THRESHOLDS = {
  routineVoiceRise: 0.08, // S_voice rise vs baseline → routine review
  criticalVoiceRise: 0.2, // sharp sustained rise → critical
  criticalVoiceWithFalls: 0.12,
  criticalFalls7d: 2,
  routineAdherence: 0.8,
  missingCheckinHours: 48,
  pillDiscrepancy: 2,
};

/** Voice Impairment Score S_voice ∈ [0,1]; higher = more impaired. */
export const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
export const impairmentFromStability = (stability: number) => clamp01(1 - stability);

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);

export interface Baseline {
  value: number;
  days: number;
  mode: "cold-start" | "rolling";
}

/**
 * Personal baseline from the days BEFORE the recent window.
 * Needs ≥3 earlier days; uses up to the 14 most recent of them.
 */
export function computeBaseline(scores: number[]): Baseline | null {
  const prior = scores.slice(0, Math.max(0, scores.length - SUSTAINED_WINDOW));
  const history = prior.length >= BASELINE_MIN_DAYS ? prior : scores.slice(0, -1);
  if (history.length < BASELINE_MIN_DAYS) return null;
  const window = history.slice(-BASELINE_MAX_DAYS);
  return {
    value: mean(window),
    days: window.length,
    mode: window.length < BASELINE_MAX_DAYS ? "cold-start" : "rolling",
  };
}

export function daysOfSupply(pillsLeft: number, pillsPerDay: number) {
  if (pillsPerDay <= 0) return Infinity;
  return Math.floor(pillsLeft / pillsPerDay);
}

export const refillDue = (pillsLeft: number, pillsPerDay: number) =>
  daysOfSupply(pillsLeft, pillsPerDay) <= REFILL_THRESHOLD_DAYS;

export interface ReliabilityInput {
  previousCount: number;
  currentCount: number;
  dosesReported: number;
  pillsPerDose: number;
  caregiverSigned: boolean;
}

/** Non-accusatory cross-check of reported doses vs pills left. */
export function checkReliability(r: ReliabilityInput) {
  const expected = r.previousCount - r.dosesReported * r.pillsPerDose;
  const gap = r.currentCount - expected;
  const mismatch = Math.abs(gap) >= THRESHOLDS.pillDiscrepancy;
  return {
    expected,
    gap,
    mismatch,
    unverified: !r.caregiverSigned,
    note: mismatch
      ? `Pill count differs from logged doses by ${Math.abs(gap)} — worth a gentle check at review.`
      : !r.caregiverSigned
        ? "Doses not yet co-signed by a caregiver."
        : undefined,
  };
}

export interface MonitoringInput {
  voiceScores: number[]; // S_voice per day, oldest → newest
  falls7d: number;
  adherence7d: number; // 0..1
  pillsLeft: number;
  pillsPerDay: number;
  lastCheckInHoursAgo: number;
  reliabilityMismatch?: boolean;
}

export interface MonitoringResult {
  level: RiskLevel;
  baseline: Baseline | null;
  recent: number | null;
  deviation: number | null; // recent − baseline
  supplyDays: number;
  reasons: string[];
}

export function assessPatient(i: MonitoringInput): MonitoringResult {
  const baseline = computeBaseline(i.voiceScores);
  const recent = i.voiceScores.length ? mean(i.voiceScores.slice(-SUSTAINED_WINDOW)) : null;
  const deviation = baseline && recent !== null ? recent - baseline.value : null;
  const supplyDays = daysOfSupply(i.pillsLeft, i.pillsPerDay);
  const reasons: string[] = [];
  let level = "stable" as RiskLevel;
  const raise = (l: RiskLevel) => {
    if (l === "critical" || (l === "routine" && level === "stable")) level = l;
  };
  const pct = (n: number) => `${n >= 0 ? "+" : ""}${Math.round(n * 100)} pts`;

  if (deviation !== null) {
    if (deviation >= THRESHOLDS.criticalVoiceRise) {
      raise("critical");
      reasons.push(`Sharp sustained voice change (${pct(deviation)} vs own baseline)`);
    } else if (
      deviation >= THRESHOLDS.criticalVoiceWithFalls &&
      i.falls7d >= THRESHOLDS.criticalFalls7d
    ) {
      raise("critical");
      reasons.push(`Voice change (${pct(deviation)}) with ${i.falls7d} falls this week`);
    } else if (deviation >= THRESHOLDS.routineVoiceRise) {
      raise("routine");
      reasons.push(`Voice trending away from baseline (${pct(deviation)})`);
    }
  } else {
    reasons.push(`Building personal baseline (${i.voiceScores.length}/${BASELINE_MIN_DAYS} days)`);
  }

  if (i.falls7d >= THRESHOLDS.criticalFalls7d && level !== "critical") {
    raise("routine");
    reasons.push(`${i.falls7d} falls reported in 7 days`);
  } else if (i.falls7d === 1) {
    raise("routine");
    reasons.push("1 fall reported this week");
  }
  if (i.adherence7d < THRESHOLDS.routineAdherence) {
    raise("routine");
    reasons.push(`Adherence ${Math.round(i.adherence7d * 100)}% over 7 days`);
  }
  if (supplyDays <= REFILL_THRESHOLD_DAYS) {
    raise("routine");
    reasons.push(`Only ${supplyDays} day${supplyDays === 1 ? "" : "s"} of medication left — refill sent`);
  }
  if (i.lastCheckInHoursAgo > THRESHOLDS.missingCheckinHours) {
    raise("routine");
    reasons.push(`No check-in for ${Math.round(i.lastCheckInHoursAgo / 24)} days`);
  }
  if (i.reliabilityMismatch) {
    raise("routine");
    reasons.push("Pill count and logged doses don't match");
  }

  return { level, baseline, recent, deviation, supplyDays, reasons };
}

export const riskLabel = (l: RiskLevel) =>
  l === "critical" ? "Critical alert" : l === "routine" ? "Routine review" : "Stable";

export const riskRank = (l: RiskLevel) => (l === "critical" ? 0 : l === "routine" ? 1 : 2);
