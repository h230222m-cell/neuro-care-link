import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { alerts as initialAlerts, fmtRelative, type Alert } from "@/lib/mockData";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/clinician/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts inbox — NeuroTrack Clinician" },
      { name: "description", content: "Tier 1 and Tier 2 patient escalations, ready to acknowledge or assign." },
      { property: "og:title", content: "Alerts inbox — NeuroTrack Clinician" },
      { property: "og:description", content: "Escalations for the Cimas care team." },
    ],
  }),
  component: Alerts,
});

function Alerts() {
  const [items, setItems] = useState<Alert[]>(initialAlerts);
  const open = items.filter((a) => !a.acknowledged);
  const closed = items.filter((a) => a.acknowledged);
  const ack = (id: string) =>
    setItems((it) => it.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)));

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Alerts inbox</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Tier 1 auto-notifies Cimas · Tier 2 requires clinician review.
      </p>

      <section className="mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Open · {open.length}</h2>
        <ul className="mt-3 space-y-3">
          {open.map((a) => (
            <li key={a.id} className="surface-card p-5">
              <div className="flex items-start gap-4">
                <div
                  className={`grid h-11 w-11 flex-none place-items-center rounded-xl ${
                    a.tier === "tier1"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-warning/20 text-warning-foreground"
                  }`}
                >
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-base font-semibold text-foreground">{a.patientName}</h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        a.tier === "tier1"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-warning/20 text-warning-foreground"
                      }`}
                    >
                      {a.tier === "tier1" ? "Tier 1 · urgent" : "Tier 2 · review"}
                    </span>
                    <span className="text-xs text-muted-foreground">{fmtRelative(a.at)}</span>
                  </div>
                  <p className="mt-1 text-sm text-foreground">{a.reason}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  to="/clinician/patients/$id"
                  params={{ id: a.patientId }}
                  className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
                >
                  Open patient
                </Link>
                <button
                  onClick={() => ack(a.id)}
                  className="rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-foreground"
                >
                  Acknowledge
                </button>
                {a.tier === "tier2" && (
                  <button className="rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-foreground">
                    Assign to nurse
                  </button>
                )}
              </div>
            </li>
          ))}
          {open.length === 0 && (
            <li className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No open alerts — nice work.
            </li>
          )}
        </ul>
      </section>

      {closed.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Recently closed · {closed.length}
          </h2>
          <ul className="mt-3 space-y-2">
            {closed.map((a) => (
              <li key={a.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{a.patientName}</p>
                  <p className="truncate text-xs text-muted-foreground">{a.reason}</p>
                </div>
                <span className="text-xs text-muted-foreground">{fmtRelative(a.at)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
