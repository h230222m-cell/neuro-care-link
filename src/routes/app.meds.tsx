import { createFileRoute } from "@tanstack/react-router";
import { patientMedications, patientCheckins, fmtRelative } from "@/lib/mockData";
import { Pill, AlertTriangle, CheckCircle2, PackageOpen } from "lucide-react";

export const Route = createFileRoute("/app/meds")({
  head: () => ({
    meta: [
      { title: "Medications — NeuroTrack" },
      { name: "description", content: "Your medication schedule, adherence, and refill supply." },
      { property: "og:title", content: "Medications — NeuroTrack" },
      { property: "og:description", content: "Levodopa, adherence, refills." },
    ],
  }),
  component: Meds,
});

function Meds() {
  const week = patientCheckins.slice(-7);
  return (
    <div className="px-5 pb-6 pt-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Medications</h1>
      <p className="mt-1 text-sm text-muted-foreground">Doses, adherence and refills.</p>

      {/* 7-day adherence strip */}
      <section className="surface-card mt-5 p-5">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Last 7 days</p>
            <p className="mt-0.5 font-display text-lg font-semibold">
              {week.filter((c) => c.medTaken).length}/7 morning doses
            </p>
          </div>
          <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
            {Math.round((week.filter((c) => c.medTaken).length / 7) * 100)}%
          </span>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-1.5">
          {week.map((c) => (
            <div key={c.date} className="flex flex-col items-center gap-1">
              <div
                className={`grid h-10 w-full place-items-center rounded-lg text-xs font-semibold ${
                  c.medTaken ? "bg-primary text-primary-foreground" : "bg-warning/20 text-warning-foreground"
                }`}
                title={c.date}
              >
                {c.medTaken ? "✓" : "×"}
              </div>
              <span className="text-[10px] text-muted-foreground">
                {new Date(c.date).toLocaleDateString(undefined, { weekday: "narrow" })}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Meds list */}
      <section className="mt-5 space-y-3">
        {patientMedications.map((m) => {
          const lowSupply = m.supplyDays <= 10;
          return (
            <article key={m.id} className="surface-card p-5">
              <div className="flex items-start gap-4">
                <div className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-primary-soft text-primary">
                  <Pill className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-base font-semibold text-foreground">{m.name}</h2>
                  <p className="text-xs text-muted-foreground">{m.dose}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.times.map((t) => (
                      <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Next</p>
                  <p className="font-display text-sm font-semibold">{fmtRelative(m.nextDue)}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg bg-muted/60 px-3 py-2.5">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Adherence 7d
                  </div>
                  <div className="mt-1 font-semibold text-foreground">{Math.round(m.adherence7d * 100)}%</div>
                </div>
                <div className={`rounded-lg px-3 py-2.5 ${lowSupply ? "bg-warning/15" : "bg-muted/60"}`}>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    {lowSupply ? <AlertTriangle className="h-3.5 w-3.5 text-warning-foreground" /> : <PackageOpen className="h-3.5 w-3.5" />}
                    Supply
                  </div>
                  <div className={`mt-1 font-semibold ${lowSupply ? "text-warning-foreground" : "text-foreground"}`}>
                    {m.supplyDays} days left
                  </div>
                </div>
              </div>

              {lowSupply && (
                <button className="mt-3 w-full rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
                  Request refill from Cimas
                </button>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}
