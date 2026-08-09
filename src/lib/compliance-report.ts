// Compliance PDF report.
//
// Builds a printable adherence summary from the same pure maths the UI uses
// (src/lib/compliance.ts) so the paper a patient hands to a clinician always
// matches what the app shows. Rendered client-side with jsPDF; no server round
// trip, so it works offline.

import { jsPDF } from "jspdf";
import type { DoseComplianceLog, Prescription } from "./api/types";
import {
  complianceRisk,
  complianceWindow,
  ON_TIME_TOLERANCE_MIN,
  pct,
  supplyForecast,
} from "./compliance";
import { fmtZonedClock, tzOffsetLabel } from "./tz";
import { DOSE_SLOT_META, type DoseSchedule } from "./dose-schedule";

type RGB = [number, number, number];
const BLUE: RGB = [47, 82, 168];
const INK: RGB = [26, 32, 44];
const GREY: RGB = [110, 119, 129];

export interface ReportInput {
  patientName: string;
  logs: DoseComplianceLog[];
  prescriptions: Prescription[];
  schedule: DoseSchedule;
  now?: Date;
}

const fmtDate = (d: Date, tz: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);

export function buildComplianceReport(input: ReportInput): jsPDF {
  const now = input.now ?? new Date();
  const tz = input.schedule.timezone;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 48;
  let y = 0;

  // ---- header band ----
  doc.setFillColor(BLUE[0], BLUE[1], BLUE[2]);
  doc.rect(0, 0, W, 92, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold").setFontSize(18);
  doc.text("NeuroTrack — Dose Compliance Report", M, 44);
  doc.setFont("helvetica", "normal").setFontSize(10);
  doc.text(
    `${input.patientName}   ·   Generated ${fmtDate(now, tz)} ${fmtZonedClock(now, tz)} (${tz}, ${tzOffsetLabel(tz, now)})`,
    M,
    64,
  );
  y = 122;

  const heading = (text: string) => {
    doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]).setFont("helvetica", "bold").setFontSize(12);
    doc.text(text, M, y);
    y += 8;
    doc.setDrawColor(BLUE[0], BLUE[1], BLUE[2]).setLineWidth(0.8);
    doc.line(M, y, W - M, y);
    y += 18;
  };

  const body = (text: string, indent = 0) => {
    doc.setTextColor(INK[0], INK[1], INK[2]).setFont("helvetica", "normal").setFontSize(10);
    const lines = doc.splitTextToSize(text, W - 2 * M - indent) as string[];
    doc.text(lines, M + indent, y);
    y += lines.length * 14;
  };

  const row = (cells: string[], widths: number[], bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal").setFontSize(9.5);
    const c: RGB = bold ? INK : GREY;
    doc.setTextColor(c[0], c[1], c[2]);
    let x = M;
    cells.forEach((c, i) => {
      doc.text(c, x, y);
      x += widths[i] ?? 80;
    });
    y += 15;
  };

  // ---- 1. adherence windows ----
  const windows = [7, 14, 30].map((d) => complianceWindow(input.logs, d, now));
  const primary = windows[0]!;
  const forecast = input.prescriptions[0]
    ? supplyForecast(input.prescriptions[0], now)
    : undefined;
  const risk = complianceRisk(
    primary,
    forecast,
    input.prescriptions[0]?.refill_threshold_days ?? 5,
  );

  heading("Overall assessment");
  doc.setFillColor(244, 247, 252);
  doc.roundedRect(M, y - 12, W - 2 * M, 58, 6, 6, "F");
  doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]).setFont("helvetica", "bold").setFontSize(26);
  const scoreText = `${risk.score}`;
  const scoreWidth = doc.getTextWidth(scoreText);
  doc.text(scoreText, M + 14, y + 22);
  doc.setFont("helvetica", "normal").setFontSize(10);
  doc.text("/100", M + 18 + scoreWidth, y + 22);
  doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(INK[0], INK[1], INK[2]);
  doc.text(risk.label, M + 92, y + 6);
  doc.setFont("helvetica", "normal").setFontSize(9.5).setTextColor(GREY[0], GREY[1], GREY[2]);
  const drivers = doc.splitTextToSize(risk.drivers.join(" · "), W - 2 * M - 110) as string[];
  doc.text(drivers.slice(0, 2), M + 92, y + 22);
  y += 66;
  body(
    "Score = 60% proportion of scheduled doses taken (PDC) + 25% punctuality (mean deviation from the scheduled time, capped at 120 min) + 15% remaining pill supply.",
  );
  y += 8;

  heading("Adherence by window");
  row(["Window", "Scheduled", "Taken", "Missed", "PDC", "On time ±30m", "Trend/day"], [80, 70, 55, 60, 60, 90, 70], true);
  windows.forEach((w) => {
    row(
      [
        `${w.days} days`,
        String(w.scheduled),
        String(w.taken),
        String(w.missed),
        pct(w.adherence),
        pct(w.onTimeRate),
        `${w.trendPerDay >= 0 ? "+" : ""}${Math.round(w.trendPerDay * 100)} pts`,
      ],
      [80, 70, 55, 60, 60, 90, 70],
    );
  });
  y += 10;

  heading("Punctuality (7 days)");
  row(["Mean deviation", "Median deviation", "Std deviation", "On-time tolerance"], [130, 130, 120, 130], true);
  row(
    [
      `${primary.meanDelayMin} min`,
      `${primary.medianDelayMin} min`,
      `${primary.delaySdMin} min`,
      `±${ON_TIME_TOLERANCE_MIN} min`,
    ],
    [130, 130, 120, 130],
  );
  y += 6;
  row(["Current streak", "Longest streak"], [130, 130], true);
  row([`${primary.currentStreak} doses`, `${primary.longestStreak} doses`], [130, 130]);
  y += 12;

  // ---- daily adherence bar chart ----
  heading("Daily adherence — last 7 days");
  const chartH = 70;
  const barW = (W - 2 * M) / primary.daily.length;
  primary.daily.forEach((d, i) => {
    const x = M + i * barW;
    const h = Math.max(2, d.adherence * chartH);
    doc.setFillColor(229, 233, 240);
    doc.rect(x + 6, y, barW - 12, chartH, "F");
    doc.setFillColor(BLUE[0], BLUE[1], BLUE[2]);
    doc.rect(x + 6, y + (chartH - h), barW - 12, h, "F");
    doc.setTextColor(GREY[0], GREY[1], GREY[2]).setFont("helvetica", "normal").setFontSize(8);
    doc.text(d.label, x + barW / 2, y + chartH + 12, { align: "center" });
    doc.text(`${d.taken}/${d.scheduled}`, x + barW / 2, y + chartH + 22, { align: "center" });
  });
  y += chartH + 40;

  // ---- 2. dose schedule ----
  heading("Prescribed dose times");
  body(`Stored on the server in ${tz} (${tzOffsetLabel(tz, now)}); reminders fire at these wall-clock times.`);
  y += 4;
  row(DOSE_SLOT_META.map((s) => s.label), [120, 120, 120, 120], true);
  row(DOSE_SLOT_META.map((s) => input.schedule[s.field]), [120, 120, 120, 120]);
  y += 14;

  if (primary.slots.length) {
    heading("Performance by dose time (7 days)");
    row(["Time", "Scheduled", "Taken", "Adherence", "Mean deviation"], [80, 80, 70, 90, 120], true);
    primary.slots.forEach((s) =>
      row(
        [s.slot, String(s.scheduled), String(s.taken), pct(s.adherence), `${s.meanDelayMin} min`],
        [80, 80, 70, 90, 120],
      ),
    );
    y += 14;
  }

  // ---- page 2: prescriptions & supply ----
  doc.addPage();
  y = 64;
  heading("Prescriptions and supply forecast");
  input.prescriptions.forEach((p) => {
    const f = supplyForecast(p, now);
    doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(INK[0], INK[1], INK[2]);
    doc.text(`${p.medication_name} — ${p.dosage_mg}`, M, y);
    y += 16;
    row(["Pills on hand", "Daily rate", "Days left", "Runs out", "Refill by", "MPR"], [90, 75, 65, 90, 90, 60], true);
    row(
      [
        `${p.current_pill_count} / ${p.total_dispensed_pills}`,
        `${f.dailyRate}/day`,
        `${f.daysRemaining}`,
        fmtDate(new Date(f.runoutDate), tz),
        fmtDate(new Date(f.refillDate), tz),
        `${f.mpr}`,
      ],
      [90, 75, 65, 90, 90, 60],
    );
    doc.setTextColor(GREY[0], GREY[1], GREY[2]).setFont("helvetica", "normal").setFontSize(9);
    doc.text(
      `${p.pills_per_dose} pill(s) × ${p.doses_per_day}/day · refill threshold ${p.refill_threshold_days} days · consumption variance ${f.consumptionVariance > 0 ? "+" : ""}${f.consumptionVariance} pills`,
      M,
      y,
    );
    y += 24;
  });

  heading("Recent dose log");
  row(["Scheduled", "Time", "Taken", "Deviation"], [140, 80, 70, 100], true);
  [...input.logs]
    .sort((a, b) => b.scheduled_time.localeCompare(a.scheduled_time))
    .slice(0, 24)
    .forEach((l) => {
      const sched = new Date(l.scheduled_time);
      const dev = l.actual_time
        ? Math.round((new Date(l.actual_time).getTime() - sched.getTime()) / 60_000)
        : null;
      row(
        [
          fmtDate(sched, tz),
          fmtZonedClock(sched, tz),
          l.was_taken ? "Yes" : "Missed",
          dev == null ? "—" : `${dev > 0 ? "+" : ""}${dev} min`,
        ],
        [140, 80, 70, 100],
      );
      if (y > doc.internal.pageSize.getHeight() - 60) {
        doc.addPage();
        y = 64;
      }
    });

  // ---- footer on every page ----
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setTextColor(GREY[0], GREY[1], GREY[2]).setFont("helvetica", "normal").setFontSize(8);
    doc.text(
      "NeuroTrack is decision-support only and does not replace clinical judgement.",
      M,
      doc.internal.pageSize.getHeight() - 28,
    );
    doc.text(`Page ${i} of ${pages}`, W - M, doc.internal.pageSize.getHeight() - 28, {
      align: "right",
    });
  }

  return doc;
}

export function downloadComplianceReport(input: ReportInput) {
  const doc = buildComplianceReport(input);
  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`neurotrack-compliance-${stamp}.pdf`);
}
