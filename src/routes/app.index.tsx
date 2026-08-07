import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { Sparkline } from "@/components/Sparkline";
import { NextDoseTimer } from "@/components/patient/NextDoseTimer";
import { useAuth } from "@/lib/auth";
import { patientCheckins, patientAppointments, fmtRelative } from "@/lib/mockData";
import { Mic, Pill, ChevronRight, CalendarClock } from "lucide-react";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Home — NeuroTrack" },
      { name: "description", content: "Your daily NeuroTrack home: today's tasks, streak, and next appointment." },
      { property: "og:title", content: "Home — NeuroTrack" },
      { property: "og:description", content: "Your calm daily overview." },
    ],
  }),
  component: Home,
});

function Home() {
  const { user } = useAuth();
  const today = patientCheckins[patientCheckins.length - 1];
  const streak = 12;
  const adherence = Math.round(
    (patientCheckins.filter((c) => c.medTaken).length / patientCheckins.length) * 100,
  );
  const nextAppt = patientAppointments.find((a) => a.status === "scheduled");
  const nextDose = patientMedications[0];

  return (
    <div className="px-5 pb-6 pt-6">
      <header className="flex items-center justify-between">
        <Logo />
        <span className="rounded-full bg-primary-soft px-3 py-1 text-[11px] font-medium text-primary">
          {streak}-day streak
        </span>
      </header>

      <div className="mt-6">
        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{greeting()}</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
          Hello, {user?.name.split(" ")[0]}
        </h1>
      </div>

      {/* Today card */}
      <section className="surface-card mt-6 overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Today's check-in</p>
            <p className="mt-0.5 font-display text-lg font-semibold">2 quick things</p>
          </div>
          <Link
            to="/app/checkin"
            className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-[var(--shadow-card)]"
          >
            Start
          </Link>
        </div>
        <ul className="mt-4 divide-y divide-border">
          {[
            { icon: Pill, label: "Confirm morning Levodopa", done: today?.medTaken ?? false },
            { icon: Mic, label: "10-second voice sample", done: false },
          ].map((t) => (
            <li key={t.label} className="flex items-center gap-3 px-5 py-3">
              <span
                className={`grid h-8 w-8 place-items-center rounded-full ${
                  t.done ? "bg-success text-success-foreground" : "bg-primary-soft text-primary"
                }`}
              >
                <t.icon className="h-4 w-4" />
              </span>
              <span className={`flex-1 text-sm ${t.done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                {t.label}
              </span>
              {t.done && <span className="text-xs font-medium text-success">Done</span>}
            </li>
          ))}
        </ul>
      </section>

      {/* Stat row */}
      <section className="mt-4 grid grid-cols-2 gap-3">
        <div className="surface-card p-4">
          <p className="text-xs text-muted-foreground">7-day adherence</p>
          <p className="mt-1 font-display text-2xl font-semibold text-foreground">{adherence}%</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${adherence}%` }} />
          </div>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs text-muted-foreground">Voice stability · 14d</p>
          <Sparkline
            className="mt-1 h-10 w-full"
            values={patientCheckins.map((c) => c.voice.stability)}
          />
        </div>
      </section>

      {/* Next dose timer & appointment */}
      <section className="mt-4 space-y-3">
        <NextDoseTimer />


        {nextAppt && (
          <Link
            to="/app/care"
            className="surface-card flex items-center gap-4 p-4 transition hover:bg-primary-soft/30"
          >
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-sm font-semibold text-foreground">
                {nextAppt.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {nextAppt.clinician} · {fmtRelative(nextAppt.when)}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        )}
      </section>

      <p className="mt-8 rounded-lg border border-border bg-card p-3 text-center text-xs text-muted-foreground">
        NeuroTrack surfaces voice and medication trends for Cimas clinicians — it does not diagnose
        or change your medication.
      </p>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
