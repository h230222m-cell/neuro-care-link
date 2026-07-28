import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Clinician dashboard — NeuroTrack" },
      { name: "description", content: "Review patient trends and flagged cases for the Cimas care team." },
      { property: "og:title", content: "Clinician dashboard — NeuroTrack" },
      { property: "og:description", content: "Trends, adherence, and escalations at a glance." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!user || user.role !== "clinician")) {
      navigate({ to: "/auth", search: { role: "clinician" } });
    }
  }, [user, loading, navigate]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo />
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user.name}</span>
            <button
              onClick={() => {
                signOut();
                navigate({ to: "/" });
              }}
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-baseline justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">Care queue</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Patients flagged for review. Tier 1 alerts have already been sent to Cimas.
            </p>
          </div>
          <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
            3 flagged for review
          </span>
        </div>

        <section className="mt-8 grid gap-4">
          {mockCases.map((c) => (
            <article
              key={c.id}
              className="surface-card flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between"
            >
              <div className="flex items-start gap-4">
                <div className="grid h-11 w-11 flex-none place-items-center rounded-full bg-primary-soft font-semibold text-primary">
                  {c.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-lg font-semibold text-foreground">{c.name}</h2>
                    <TierBadge tier={c.tier} />
                  </div>
                  <p className="mt-1 max-w-xl text-sm text-muted-foreground">{c.summary}</p>
                </div>
              </div>
              <div className="flex flex-none items-center gap-2">
                <button className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:bg-primary-soft">
                  View trends
                </button>
                {c.tier === "tier2" && (
                  <button className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-95">
                    Notify Cimas
                  </button>
                )}
              </div>
            </article>
          ))}
        </section>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          NeuroTrack is decision-support only. It flags trends for review — it does not diagnose
          Parkinson's or change medication. Aligned with Zimbabwe's National AI Strategy 2026–2030.
        </p>

        <div className="mt-6 text-center">
          <Link to="/" className="text-xs font-medium text-primary hover:underline">
            ← Back home
          </Link>
        </div>
      </main>
    </div>
  );
}

function TierBadge({ tier }: { tier: "tier1" | "tier2" }) {
  if (tier === "tier1") {
    return (
      <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-destructive">
        Tier 1 · auto-alerted
      </span>
    );
  }
  return (
    <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-warning-foreground">
      Tier 2 · needs review
    </span>
  );
}

const mockCases = [
  {
    id: "1",
    name: "Tendai Moyo",
    tier: "tier1" as const,
    summary:
      "Two falls in 48h with sharp decline in voice stability vs baseline. Adherence at 40% this week.",
  },
  {
    id: "2",
    name: "Grace Ncube",
    tier: "tier2" as const,
    summary:
      "Voice tremor trending upward over 10 days. Diary stiffness score up from baseline; adherence stable.",
  },
  {
    id: "3",
    name: "Farai Dube",
    tier: "tier2" as const,
    summary:
      "Missed 3 morning doses this week. No voice deterioration yet — worth a check-in call.",
  },
];
