import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pill, AlertTriangle, CheckCircle2, PackageOpen, Truck } from "lucide-react";
import {
  adherenceFromLogs,
  createRefillOrder,
  listDoseLogs,
  listPrescriptions,
  listRefillOrders,
} from "@/lib/api/client";
import { needsRefill, REFILL_STATUS_LABEL } from "@/lib/api/types";
import { fmtRelative } from "@/lib/mockData";

export const Route = createFileRoute("/app/meds")({
  head: () => ({
    meta: [
      { title: "Medications — NeuroTrack" },
      { name: "description", content: "Your prescriptions, pill supply, dose compliance and Cimas refill orders." },
      { property: "og:title", content: "Medications — NeuroTrack" },
      { property: "og:description", content: "Pill inventory, adherence, automatic refills." },
    ],
  }),
  component: Meds,
});

function Meds() {
  const qc = useQueryClient();
  const prescriptions = useQuery({ queryKey: ["prescriptions"], queryFn: () => listPrescriptions() });
  const doseLogs = useQuery({ queryKey: ["dose-logs"], queryFn: () => listDoseLogs() });
  const refills = useQuery({ queryKey: ["refill-orders"], queryFn: () => listRefillOrders() });

  const requestRefill = useMutation({
    mutationFn: (prescription: number) =>
      createRefillOrder({ prescription, notes: "Requested by patient from the NeuroTrack app." }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["refill-orders"] });
      qc.invalidateQueries({ queryKey: ["prescriptions"] });
    },
  });

  const logs = doseLogs.data ?? [];
  const adherence = adherenceFromLogs(logs, 7);
  const weekLogs = logs
    .filter((l) => new Date(l.scheduled_time).getTime() >= Date.now() - 7 * 86400_000)
    .slice()
    .sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time));

  return (
    <div className="px-5 pb-6 pt-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Medications</h1>
      <p className="mt-1 text-sm text-muted-foreground">Doses, pill supply and Cimas refills.</p>

      {/* Dose compliance over the last 7 days */}
      <section className="surface-card mt-5 p-5">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Dose compliance · 7 days</p>
            <p className="mt-0.5 font-display text-lg font-semibold">
              {weekLogs.filter((l) => l.was_taken).length}/{weekLogs.length || 0} doses taken
            </p>
          </div>
          <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
            {Math.round(adherence * 100)}%
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {weekLogs.map((l) => (
            <div
              key={l.id}
              title={`${new Date(l.scheduled_time).toLocaleString()} · ${l.was_taken ? "taken" : "missed"}`}
              className={`grid h-9 w-9 place-items-center rounded-lg text-xs font-semibold ${
                l.was_taken ? "bg-primary text-primary-foreground" : "bg-warning/20 text-warning-foreground"
              }`}
            >
              {l.was_taken ? "✓" : "×"}
            </div>
          ))}
          {weekLogs.length === 0 && (
            <p className="text-sm text-muted-foreground">No dose logs yet this week.</p>
          )}
        </div>
      </section>

      {/* Prescriptions */}
      <section className="mt-5 space-y-3">
        {prescriptions.data?.map((p) => {
          const low = needsRefill(p);
          const pending = refills.data?.find(
            (r) => r.prescription === p.id && r.status !== "COMPLETED" && r.status !== "CANCELLED",
          );
          const pctLeft = Math.round((p.current_pill_count / p.total_dispensed_pills) * 100);
          return (
            <article key={p.id} className="surface-card p-5">
              <div className="flex items-start gap-4">
                <div className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-primary-soft text-primary">
                  <Pill className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-base font-semibold text-foreground">{p.medication_name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {p.dosage_mg} · {p.pills_per_dose} pill{p.pills_per_dose > 1 ? "s" : ""} ×{" "}
                    {p.doses_per_day}/day
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Daily rate</p>
                  <p className="font-display text-sm font-semibold">{p.daily_dose_rate} pills</p>
                </div>
              </div>

              {/* Pill inventory bar */}
              <div className="mt-4">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-muted-foreground">Bottle</span>
                  <span className="font-semibold text-foreground">
                    {p.current_pill_count} / {p.total_dispensed_pills} pills
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${low ? "bg-warning" : "bg-primary"}`}
                    style={{ width: `${Math.max(2, pctLeft)}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg bg-muted/60 px-3 py-2.5">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Compliance 7d
                  </div>
                  <div className="mt-1 font-semibold text-foreground">
                    {Math.round(adherenceFromLogs(logs.filter((l) => l.prescription === p.id), 7) * 100)}%
                  </div>
                </div>
                <div className={`rounded-lg px-3 py-2.5 ${low ? "bg-warning/15" : "bg-muted/60"}`}>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    {low ? <AlertTriangle className="h-3.5 w-3.5 text-warning-foreground" /> : <PackageOpen className="h-3.5 w-3.5" />}
                    Supply
                  </div>
                  <div className={`mt-1 font-semibold ${low ? "text-warning-foreground" : "text-foreground"}`}>
                    {p.days_supply_remaining} days left
                  </div>
                </div>
              </div>

              {pending ? (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-primary-soft px-3 py-2.5 text-xs text-primary">
                  <Truck className="h-3.5 w-3.5" />
                  <span className="font-semibold">{REFILL_STATUS_LABEL[pending.status]}</span>
                  <span className="text-primary/70">
                    · triggered at {pending.days_left_at_trigger} days · {fmtRelative(pending.requested_at)}
                  </span>
                </div>
              ) : (
                low && (
                  <button
                    onClick={() => requestRefill.mutate(p.id)}
                    disabled={requestRefill.isPending}
                    className="mt-3 w-full rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    {requestRefill.isPending ? "Sending…" : "Request refill from Cimas"}
                  </button>
                )
              )}
            </article>
          );
        })}
        {prescriptions.isLoading && (
          <div className="surface-card h-40 animate-pulse bg-muted/50" />
        )}
      </section>
    </div>
  );
}
