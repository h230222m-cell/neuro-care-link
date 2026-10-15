import { describe, expect, it } from "vitest";
import { assessPatient, checkReliability, computeBaseline, daysOfSupply, refillDue } from "./monitoring";

const base = { falls7d: 0, adherence7d: 1, pillsLeft: 90, pillsPerDay: 3, lastCheckInHoursAgo: 4 };

describe("monitoring rules", () => {
  it("needs 3 days before a baseline exists", () => {
    expect(computeBaseline([0.1, 0.1])).toBeNull();
    expect(computeBaseline([0.1, 0.1, 0.1, 0.1])?.days).toBe(3);
  });

  it("rolling baseline caps at 14 days", () => {
    const b = computeBaseline(Array(30).fill(0.1));
    expect(b?.days).toBe(14);
    expect(b?.mode).toBe("rolling");
  });

  it("refill triggers at 3 days of supply or fewer", () => {
    expect(daysOfSupply(9, 3)).toBe(3);
    expect(refillDue(9, 3)).toBe(true);
    expect(refillDue(12, 3)).toBe(false);
  });

  it("stable patient stays stable", () => {
    expect(assessPatient({ ...base, voiceScores: Array(14).fill(0.1) }).level).toBe("stable");
  });

  it("sharp sustained voice rise is critical", () => {
    const s = [...Array(11).fill(0.1), 0.35, 0.35, 0.35];
    expect(assessPatient({ ...base, voiceScores: s }).level).toBe("critical");
  });

  it("a one-day blip is not critical", () => {
    const s = [...Array(13).fill(0.1), 0.4];
    expect(assessPatient({ ...base, voiceScores: s }).level).not.toBe("critical");
  });

  it("repeated falls plus voice change is critical", () => {
    const s = [...Array(11).fill(0.1), 0.24, 0.24, 0.24];
    expect(assessPatient({ ...base, falls7d: 2, voiceScores: s }).level).toBe("critical");
  });

  it("low supply flags routine review", () => {
    expect(assessPatient({ ...base, pillsLeft: 6, voiceScores: Array(14).fill(0.1) }).level).toBe("routine");
  });

  it("pill count mismatch of 2+ is flagged", () => {
    const r = checkReliability({ previousCount: 30, currentCount: 28, dosesReported: 4, pillsPerDose: 1, caregiverSigned: true });
    expect(r.mismatch).toBe(true);
  });
});
