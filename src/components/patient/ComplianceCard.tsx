import { useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Minus, Flame, Clock, Target, Gauge } from "lucide-react";
import type { DoseComplianceLog, Prescription } from "@/lib/api/types";
import {
  complianceRisk,
  complianceWindow,
  ON_TIME_TOLERANCE_MIN,
  pct,
  supplyForecast,
} from "@/lib/compliance";

const WINDOWS = [7, 14, 30] as const;

/** Mathematical dose-compliance panel: PDC, punctuality, streaks, trend, slots. */
export function ComplianceCard({
  logs,
  prescriptions,
}: {
  logs: DoseComplianceLog[];
  prescriptions: Prescription[];
}) {
  const [days, setDays] = useState<(typeof WINDOWS)[number]>(7);

  const w = useMemo(() => complianceWindow(logs, days), [logs, days]);
  const forecast = useMemo(
    () => (prescriptions[0] ? supplyForecast(prescriptions[0]) : undefined),
    [prescriptions],
  );
  const risk = useMemo(
    () => complianceRisk(w, forecast, prescriptions[0]?.refill_threshold_days ?? 5),
    [w, forecast, prescriptions],
  );

  const trendPts = Math.round(w.trendPerDay * 100);
  const TrendIcon = trendPts > 0 ? TrendingUp : trendPts < 0 ? TrendingDown : Minus;
  const bandTone =
    risk.band === "on-track"
      ? "bg-success/15 text-success"
      : risk.band === "watch"
        ? "bg-warning/15 text-warning-foreground"
        : "bg-destructive/10 text-destructive";

  return (
    <section className="surface-card overflow-hidden">
      {/* header + window switch */}
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Dose compliance
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {w.taken} of {w.scheduled} scheduled doses · last {days} days
          </p>
        </div>
        <div className="flex flex-none rounded-full bg-muted p-0.5">
          {WINDOWS.map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums transition ${
                d === days ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* ring + headline metrics */}
      <div className="flex items-center gap-5 px-5 py-5">
        <AdherenceRing value={w.adherence} score={risk.score} />
        <div className="min-w-0 flex-1">
          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${bandTone}`}>
            {risk.label} · score {risk.score}/100
          </span>
          <ul className="mt-2 space-y-1">
            {risk.drivers.slice(0, 2).map((d) => (
              <li key={d} className="text-xs leading-snug text-muted-foreground">
                • {d}
              </li>
            ))}
          </ul>
          <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-foreground">
            <TrendIcon className="h-3.5 w-3.5" />
            {trendPts === 0
              ? "Flat trend"
              : `${trendPts > 0 ? "+" : ""}${trendPts} pts/day trend`}
          </p>
        </div>
      </div>

      {/* metric grid */}
      <div className="grid grid-cols-2 gap-px bg-border/60 sm:grid-cols-4">
        <Metric icon={Flame} label="Streak" value={`${w.currentStreak}`} hint={`best ${w.longestStreak}`} />
        <Metric
          icon={Clock}
          label="Avg delay"
          value={`${Math.round(w.meanDelayMin)}m`}
          hint={`± ${Math.round(w.delaySdMin)}m sd`}
        />
        <Metric
          icon={Target}
          label={`On time ±${ON_TIME_TOLERANCE_MIN}m`}
          value={pct(w.onTimeRate)}
          hint={`median ${Math.round(w.medianDelayMin)}m`}
        />
        <Metric
          icon={Gauge}
          label="Missed"
          value={`${w.missed}`}
          hint={forecast ? `${forecast.daysRemaining}d supply` : "—"}
        />
      </div>

      {/* daily adherence bars */}
      <div className="px-5 pt-5">
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          Daily adherence
        </p>
        <div className="mt-3 flex h-24 items-end gap-1">
          {w.daily.map((d) => (
            <div key={d.date} className="group flex h-full flex-1 flex-col justify-end">
              <div
                title={`${d.date} · ${d.taken}/${d.scheduled} doses`}
                className={`w-full rounded-t-md transition ${
                  d.scheduled === 0
                    ? "bg-muted"
                    : d.adherence === 1
                      ? "bg-primary"
                      : d.adherence >= 0.5
                        ? "bg-primary/55"
                        : "bg-warning"
                }`}
                style={{ height: `${d.scheduled === 0 ? 4 : Math.max(8, d.adherence * 100)}%` }}
              />
            </div>
          ))}
        </div>
        {days <= 14 && (
          <div className="mt-1.5 flex gap-1">
            {w.daily.map((d) => (
              <span
                key={d.date}
                className="flex-1 text-center text-[9px] text-muted-foreground"
              >
                {d.label.slice(0, 1)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* per-slot performance */}
      {w.slots.length > 0 && (
        <div className="px-5 pb-5 pt-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            By pill time
          </p>
          <div className="mt-2.5 space-y-2">
            {w.slots.map((s) => (
              <div key={s.slot} className="flex items-center gap-3">
                <span className="w-12 flex-none text-xs font-semibold tabular-nums text-foreground">
                  {s.slot}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${s.adherence >= 0.9 ? "bg-primary" : s.adherence >= 0.6 ? "bg-primary/55" : "bg-warning"}`}
                    style={{ width: `${Math.max(3, s.adherence * 100)}%` }}
                  />
                </div>
                <span className="w-10 flex-none text-right text-xs tabular-nums text-muted-foreground">
                  {pct(s.adherence)}
                </span>
                <span className="w-14 flex-none text-right text-[11px] tabular-nums text-muted-foreground">
                  +{Math.round(s.meanDelayMin)}m
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function AdherenceRing({ value, score }: { value: number; score: number }) {
  const r = 34;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative h-24 w-24 flex-none">
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" strokeWidth="8" className="stroke-muted" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - value)}
          className={score >= 85 ? "stroke-primary" : score >= 65 ? "stroke-warning" : "stroke-destructive"}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <p className="font-display text-xl font-semibold tabular-nums leading-none">
            {Math.round(value * 100)}
            <span className="text-xs">%</span>
          </p>
          <p className="mt-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">PDC</p>
        </div>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="bg-card px-4 py-3">
      <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </p>
      <p className="mt-1 font-display text-lg font-semibold tabular-nums leading-none">{value}</p>
      <p className="mt-1 text-[10px] text-muted-foreground">{hint}</p>
    </div>
  );
}
