import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { patientCheckins } from "@/lib/mockData";
import { Sparkline } from "@/components/Sparkline";

type Metric = "stability" | "jitter" | "shimmer";

export const Route = createFileRoute("/app/history")({
  head: () => ({
    meta: [
      { title: "Voice trends — NeuroTrack" },
      { name: "description", content: "Two-week voice trends and medication adherence history." },
      { property: "og:title", content: "Voice trends — NeuroTrack" },
      { property: "og:description", content: "Your voice and adherence trends over time." },
    ],
  }),
  component: History,
});

const labels: Record<Metric, string> = {
  stability: "Voice stability",
  jitter: "Jitter",
  shimmer: "Shimmer",
};

function History() {
  const [metric, setMetric] = useState<Metric>("stability");
  const series = patientCheckins.map((c) => c.voice[metric]);

  const latest = series.at(-1)!;
  const first = series[0];
  const delta = ((latest - first) / (first || 1)) * 100;
  // For jitter/shimmer a rise is unfavourable; for stability a rise is good.
  const good = metric === "stability" ? delta >= 0 : delta <= 0;
  const adherence = Math.round(
    (patientCheckins.filter((c) => c.medTaken).length / patientCheckins.length) * 100,
  );

  return (
    <div className="px-5 pb-6 pt-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Voice trends</h1>
      <p className="mt-1 text-sm text-muted-foreground">Last 14 days.</p>

      <div className="mt-5 flex flex-wrap gap-1.5">
        {(Object.keys(labels) as Metric[]).map((k) => (
          <button
            key={k}
            onClick={() => setMetric(k)}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
              metric === k
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {labels[k]}
          </button>
        ))}
      </div>

      <section className="surface-card mt-4 p-5">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{labels[metric]}</p>
            <p className="mt-0.5 font-display text-2xl font-semibold">{latest.toFixed(3)}</p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              good ? "bg-success/15 text-success-foreground" : "bg-warning/20 text-warning-foreground"
            }`}
          >
            {delta >= 0 ? "+" : ""}
            {delta.toFixed(1)}% vs 14d ago
          </span>
        </div>
        <Sparkline values={series} className="mt-4 h-24 w-full" />
        <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
          <span>{patientCheckins[0].date}</span>
          <span>{patientCheckins.at(-1)!.date}</span>
        </div>
      </section>

      <section className="surface-card mt-4 p-5">
        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">14-day adherence</p>
        <p className="mt-0.5 font-display text-2xl font-semibold">{adherence}%</p>
        <div className="mt-3 flex gap-1">
          {patientCheckins.map((c) => (
            <span
              key={c.date}
              title={`${c.date} · ${c.medTaken ? "taken" : "missed"}`}
              className={`h-8 flex-1 rounded ${c.medTaken ? "bg-primary" : "bg-warning/50"}`}
            />
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Recent check-ins
        </h2>
        <ul className="mt-3 space-y-2">
          {[...patientCheckins].reverse().slice(0, 10).map((c) => (
            <li key={c.date} className="surface-card flex items-center gap-4 p-4">
              <div className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-primary-soft text-primary">
                <span className="text-xs font-semibold">
                  {new Date(c.date).toLocaleDateString(undefined, { day: "2-digit", month: "short" })}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  <span className={c.medTaken ? "text-success" : "text-warning-foreground"}>
                    {c.medTaken ? "Meds on time" : "Missed morning"}
                  </span>
                  <span className="text-muted-foreground">Jitter {c.voice.jitter.toFixed(3)}</span>
                </div>
                {c.notes && <p className="mt-1 truncate text-xs text-muted-foreground">"{c.notes}"</p>}
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase text-muted-foreground">Voice</p>
                <p className="font-display text-sm font-semibold text-foreground">
                  {c.voice.stability.toFixed(2)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
