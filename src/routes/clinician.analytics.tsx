import { createFileRoute } from "@tanstack/react-router";
import { Sparkline } from "@/components/Sparkline";
import { roster } from "@/lib/mockData";

export const Route = createFileRoute("/clinician/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — NeuroTrack Clinician" },
      { name: "description", content: "Cohort adherence, voice trends and tier distribution across your NeuroTrack patients." },
      { property: "og:title", content: "Analytics — NeuroTrack Clinician" },
      { property: "og:description", content: "Population-level insights for the neurology care team." },
    ],
  }),
  component: Analytics,
});

function Analytics() {
  const total = roster.length;
  const avgAdh = Math.round((roster.reduce((s, p) => s + p.adherence7d, 0) / total) * 100);
  const tier1 = roster.filter((p) => p.tier === "tier1").length;
  const tier2 = roster.filter((p) => p.tier === "tier2").length;
  const stable = roster.filter((p) => p.tier === "stable").length;

  // synthesize a cohort voice trend as the mean of individual trends
  const days = roster[0].voiceTrend.length;
  const cohortVoice = Array.from({ length: days }, (_, i) =>
    roster.reduce((s, p) => s + p.voiceTrend[i], 0) / total,
  );

  const bars = [
    { label: "Tier 1", value: tier1, color: "bg-destructive" },
    { label: "Tier 2", value: tier2, color: "bg-warning" },
    { label: "Stable", value: stable, color: "bg-success" },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Cohort analytics</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Population-level view of the {total} patients under NeuroTrack monitoring.
      </p>

      <section className="mt-6 grid gap-3 sm:grid-cols-4">
        {[
          { k: "Patients", v: total },
          { k: "Avg adherence · 7d", v: `${avgAdh}%` },
          { k: "Open alerts", v: tier1 + tier2 },
          { k: "Stable", v: stable },
        ].map((s) => (
          <div key={s.k} className="surface-card p-4">
            <p className="text-xs text-muted-foreground">{s.k}</p>
            <p className="mt-1 font-display text-2xl font-semibold text-foreground">{s.v}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="surface-card p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-base font-semibold">Cohort voice stability</h2>
            <span className="text-xs text-muted-foreground">Rolling 14 days · mean</span>
          </div>
          <Sparkline values={cohortVoice} className="mt-4 h-32 w-full" />
          <p className="mt-2 text-xs text-muted-foreground">
            A downward trend across the cohort may indicate seasonal or supply-chain factors —
            not a diagnosis.
          </p>
        </div>

        <div className="surface-card p-5">
          <h2 className="font-display text-base font-semibold">Tier distribution</h2>
          <ul className="mt-4 space-y-3">
            {bars.map((b) => {
              const pct = (b.value / total) * 100;
              return (
                <li key={b.label}>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-medium text-foreground">{b.label}</span>
                    <span className="text-muted-foreground">
                      {b.value} · {Math.round(pct)}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                    <div className={`h-full rounded-full ${b.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="surface-card p-5 lg:col-span-2">
          <h2 className="font-display text-base font-semibold">Adherence · by patient</h2>
          <ul className="mt-4 space-y-2.5">
            {[...roster].sort((a, b) => a.adherence7d - b.adherence7d).map((p) => {
              const pct = p.adherence7d * 100;
              const color = pct < 60 ? "bg-destructive" : pct < 80 ? "bg-warning" : "bg-primary";
              return (
                <li key={p.id} className="grid grid-cols-[140px_1fr_60px] items-center gap-3 text-xs">
                  <span className="truncate font-medium text-foreground">{p.name}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-right font-semibold text-foreground">{Math.round(pct)}%</span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        NeuroTrack is decision-support only. Aligned with Zimbabwe's National AI Strategy 2026–2030,
        NDS1 and NDS2 digital healthcare goals.
      </p>
    </div>
  );
}
