import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Sparkline } from "@/components/Sparkline";
import { patientCheckins, roster, tierLabel, type PatientSummary } from "@/lib/mockData";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/clinician/patients/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Patient ${params.id} — NeuroTrack Clinician` },
      { name: "description", content: "Detailed patient view: voice stability and medication adherence." },
      { property: "og:title", content: "Patient detail — NeuroTrack" },
      { property: "og:description", content: "Focused trend detail for a monitored patient." },
    ],
  }),
  loader: ({ params }): { patient: PatientSummary } => {
    const patient = roster.find((p) => p.id === params.id);
    if (!patient) throw notFound();
    return { patient };
  },
  component: PatientDetail,
});

function PatientDetail() {
  const { patient } = Route.useLoaderData() as { patient: PatientSummary };
  const checkins = patientCheckins; // shared demo timeline
  const adherence = Math.round(patient.adherence7d * 100);

  return (
    <div>
      <Link
        to="/clinician"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Roster
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="grid h-14 w-14 flex-none place-items-center rounded-full bg-primary-soft font-display text-lg font-semibold text-primary">
            {patient.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">{patient.name}</h1>
            <p className="text-sm text-muted-foreground">
              {patient.age}y {patient.gender} · {patient.location}
            </p>
            <span
              className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                patient.tier === "tier1"
                  ? "bg-destructive/10 text-destructive"
                  : patient.tier === "tier2"
                    ? "bg-warning/20 text-warning-foreground"
                    : "bg-success/15 text-success-foreground"
              }`}
            >
              {tierLabel(patient.tier)}
            </span>
          </div>
        </div>
      </header>

      {patient.flag && (
        <div className="mt-5 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
          <span className="font-semibold">Flag: </span>
          {patient.flag}
        </div>
      )}

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="surface-card p-5">
          <p className="text-xs text-muted-foreground">Adherence · 7d</p>
          <p className="mt-1 font-display text-3xl font-semibold text-foreground">{adherence}%</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className={`h-full rounded-full ${adherence < 60 ? "bg-warning" : "bg-primary"}`} style={{ width: `${adherence}%` }} />
          </div>
        </div>
        <div className="surface-card p-5">
          <p className="text-xs text-muted-foreground">Voice stability · 14d</p>
          <Sparkline values={patient.voiceTrend} className="mt-2 h-12 w-full" />
          <p className="mt-1 text-xs text-muted-foreground">
              Latest {patient.voiceTrend[patient.voiceTrend.length - 1]?.toFixed(2)} · baseline {patient.voiceTrend[0]?.toFixed(2)}
          </p>
        </div>
        <div className="surface-card p-5">
          <p className="text-xs text-muted-foreground">Missed doses · 14d</p>
          <p className="mt-1 font-display text-3xl font-semibold text-foreground">
            {checkins.filter((c) => !c.medTaken).length}
          </p>
          <p className="text-xs text-muted-foreground">From daily medication confirmations</p>
        </div>
      </section>

      <section className="mt-6 surface-card p-5">
        <h2 className="font-display text-base font-semibold">Voice stability · 14 days</h2>
        <Sparkline values={checkins.map((c) => c.voice.stability)} className="mt-4 h-20 w-full" />
      </section>

      <section className="mt-6">
        <h2 className="font-display text-base font-semibold">Check-in timeline</h2>
        <ul className="mt-3 space-y-2">
          {[...checkins].reverse().map((c) => (
            <li key={c.date} className="surface-card flex items-center gap-4 p-4">
              <div className="grid h-10 w-10 flex-none place-items-center rounded-lg bg-primary-soft text-primary">
                <span className="text-[10px] font-semibold">
                  {new Date(c.date).toLocaleDateString(undefined, { day: "2-digit", month: "short" })}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  <span className={c.medTaken ? "text-success" : "text-warning-foreground"}>
                    {c.medTaken ? "Meds on time" : "Missed morning"}
                  </span>
                </div>
                {c.notes && <p className="mt-1 text-xs text-muted-foreground">"{c.notes}"</p>}
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase text-muted-foreground">Voice</p>
                <p className="font-display text-sm font-semibold">{c.voice.stability.toFixed(2)}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
