import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NeuroTrack — Daily check-ins for Parkinson's patients" },
      {
        name: "description",
        content:
          "A calm daily check-in for patients and a clear trend view for the Cimas care team. Decision-support only.",
      },
      { property: "og:title", content: "NeuroTrack — Daily check-ins for Parkinson's patients" },
      {
        property: "og:description",
        content: "Warm, safe remote monitoring built with the Cimas care team.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === "patient") navigate({ to: "/checkin" });
    if (user?.role === "clinician") navigate({ to: "/dashboard" });
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

      <main className="mx-auto max-w-6xl px-6 pt-10 pb-24">
        <section className="grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Built with Cimas · Zimbabwe
            </span>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl">
              Parkinson's care that checks in, <span className="text-primary">every day</span>.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">
              NeuroTrack turns the months between neurologist visits into a gentle daily
              routine — medication confirmations, a short voice sample, and a symptom diary.
              We surface trends for the Cimas care team; clinicians decide.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/auth"
                search={{ role: "patient" }}
                className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-card)] transition hover:opacity-95"
              >
                I'm a patient
              </Link>
              <Link
                to="/auth"
                search={{ role: "clinician" }}
                className="inline-flex items-center justify-center rounded-full border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-primary-soft"
              >
                I'm a clinician
              </Link>
            </div>

            <p className="mt-6 text-xs text-muted-foreground">
              Decision-support only. NeuroTrack does not diagnose or prescribe — it flags trends
              for a licensed clinician to review.
            </p>
          </div>

          <div className="surface-soft relative overflow-hidden p-1">
            <div className="surface-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Today's check-in</p>
                  <p className="mt-1 font-display text-xl font-semibold">Good morning, Tendai</p>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-full bg-primary-soft text-primary">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M12 8v5l3 2" strokeLinecap="round" /><circle cx="12" cy="12" r="9" /></svg>
                </div>
              </div>

              <ul className="mt-6 space-y-3 text-sm">
                {[
                  { label: "Confirm morning Levodopa", done: true },
                  { label: "Record 10-second voice sample", done: false },
                  { label: "Log any tremor or falls", done: false },
                ].map((s) => (
                  <li key={s.label} className="flex items-center gap-3 rounded-lg border border-border bg-background/60 px-3 py-2.5">
                    <span
                      className={`grid h-6 w-6 place-items-center rounded-full ${
                        s.done ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {s.done ? "✓" : ""}
                    </span>
                    <span className={s.done ? "text-muted-foreground line-through" : "text-foreground"}>{s.label}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 rounded-lg bg-primary-soft p-3 text-xs text-primary">
                Your data is reviewed by Cimas neurology. You'll only hear from us if something needs attention.
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
