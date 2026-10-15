import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/lib/auth";
import { ShieldCheck, HeartPulse, Mic } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NeuroTrack — Daily monitoring for Parkinson's care" },
      {
        name: "description",
        content:
          "A calm daily check-in for patients and a focused clinical console for clinicians. Decision-support only.",
      },
      { property: "og:title", content: "NeuroTrack — Daily monitoring for Parkinson's care" },
      { property: "og:description", content: "Focused daily monitoring built with Cimas neurology in Zimbabwe." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === "patient") navigate({ to: "/app" });
    if (user?.role === "clinician") navigate({ to: "/clinician" });
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo />
        <Link
          to="/auth"
          className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-[var(--shadow-soft)] transition hover:bg-primary-soft"
        >
          Sign in
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-6">
        <section className="grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Remote monitoring · Zimbabwe
            </span>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl">
              Parkinson's care that checks in, <span className="text-primary">every day</span>.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">
              NeuroTrack keeps Parkinson's monitoring simple: daily medication confirmation,
              a short voice sample, appointment timing, and a focused clinician console.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/auth"
                search={{ role: "patient" }}
                className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-card)] transition hover:opacity-95"
              >
                Open patient app
              </Link>
              <Link
                to="/auth"
                search={{ role: "clinician" }}
                className="inline-flex items-center justify-center rounded-full border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-primary-soft"
              >
                Open clinician console
              </Link>
            </div>

            <p className="mt-6 text-xs text-muted-foreground">
              Decision-support only. NeuroTrack flags trends for a licensed clinician — it does
              not diagnose or change medication.
            </p>
          </div>

          <div className="surface-soft relative overflow-hidden p-1">
            <div className="surface-card space-y-4 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Patient · Home</p>
                  <p className="mt-1 font-display text-xl font-semibold">Good morning, Tendai</p>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-full bg-primary-soft text-primary">
                  <HeartPulse className="h-5 w-5" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                {[
                  { k: "Streak", v: "12d" },
                  { k: "Adherence", v: "86%" },
                  { k: "Voice", v: "Stable" },
                ].map((m) => (
                  <div key={m.k} className="rounded-lg bg-primary-soft/60 py-2">
                    <div className="font-display text-base font-semibold text-foreground">{m.v}</div>
                    <div className="text-muted-foreground">{m.k}</div>
                  </div>
                ))}
              </div>
              <ul className="space-y-2 text-sm">
                {[
                  { label: "Morning Levodopa", done: true, icon: ShieldCheck },
                  { label: "10-second voice sample", done: false, icon: Mic },
                ].map((s) => (
                  <li key={s.label} className="flex items-center gap-3 rounded-lg border border-border bg-background/60 px-3 py-2.5">
                    <span className={`grid h-7 w-7 place-items-center rounded-full ${s.done ? "bg-success text-success-foreground" : "bg-primary-soft text-primary"}`}>
                      <s.icon className="h-3.5 w-3.5" />
                    </span>
                    <span className={s.done ? "text-muted-foreground line-through" : "text-foreground"}>{s.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="mt-24 grid gap-4 md:grid-cols-3">
          {[
            { t: "Patient app", d: "Home, medication tracking, voice trends and appointment reminders — designed for phones and older users." },
            { t: "Clinical console", d: "Roster with tier flags, individual trends, alerts inbox, and cohort analytics." },
            { t: "Voice biomarker", d: "10-second vowel samples feed an MFCC → L1 → SVM pipeline to flag motor decline early." },
          ].map((c) => (
            <div key={c.t} className="surface-card p-5">
              <h3 className="font-display text-base font-semibold text-foreground">{c.t}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{c.d}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
