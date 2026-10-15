import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Pill, Check, X } from "lucide-react";
import { createDoseLog, listPrescriptions } from "@/lib/api/client";
import { doseTimes, type Prescription } from "@/lib/api/types";
import { daysOfSupply, REFILL_THRESHOLD_DAYS } from "@/lib/monitoring";
import { VoiceCaptureCard } from "@/components/patient/VoiceCaptureCard";
import { fmtClock, slotDate } from "@/lib/dose-timers";

export const Route = createFileRoute("/app/checkin")({
  head: () => ({
    meta: [
      { title: "Daily check-in — NeuroTrack" },
      { name: "description", content: "Confirm each prescribed dose and record a short voice sample." },
      { property: "og:title", content: "Daily check-in — NeuroTrack" },
      { property: "og:description", content: "Under two minutes." },
    ],
  }),
  component: CheckIn,
});

type DoseStatus = "taken" | "missed";

/** The dose slot closest to now for a prescription — what we're confirming. */
function currentSlot(p: Prescription, now: Date) {
  const slots = doseTimes(p);
  let best = slots[0] ?? "08:00";
  let bestDelta = Infinity;
  for (const s of slots) {
    const delta = Math.abs(slotDate(s, now).getTime() - now.getTime());
    if (delta < bestDelta) {
      bestDelta = delta;
      best = s;
    }
  }
  return best;
}

function CheckIn() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const prescriptions = useQuery({ queryKey: ["prescriptions"], queryFn: () => listPrescriptions() });
  const [step, setStep] = useState(0);
  const [statuses, setStatuses] = useState<Record<number, DoseStatus>>({});
  const [notes, setNotes] = useState("");
  const [voiceOk, setVoiceOk] = useState(false);
  const [counts, setCounts] = useState<Record<number, string>>({});
  const [pin, setPin] = useState("");
  const [noCaregiver, setNoCaregiver] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const now = useMemo(() => new Date(), []);
  const active = (prescriptions.data ?? []).filter((p) => p.is_active);
  const allAnswered = active.length > 0 && active.every((p) => statuses[p.id]);

  const countsOk = active.length > 0 && active.every((p) => counts[p.id] !== undefined && counts[p.id] !== "" && Number(counts[p.id]) >= 0);
  const caregiverOk = noCaregiver || /^\d{4}$/.test(pin);
  const steps = ["Medication", "Pill count", "Voice sample"];
  const canNext = [allAnswered, countsOk && caregiverOk, voiceOk][step];

  const submit = async () => {
    setSaving(true);
    // One DoseComplianceLog row per prescription (neurotrack_dosecompliancelog).
    await Promise.all(
      active.map((p) =>
        createDoseLog({
          prescription: p.id,
          was_taken: statuses[p.id] === "taken",
          actual_time: statuses[p.id] === "taken" ? new Date().toISOString() : null,
          notes:
            [
              `pills_left=${counts[p.id] ?? ""}`,
              noCaregiver ? "caregiver=unsigned" : "caregiver=signed",
              notes.trim(),
            ]
              .filter(Boolean)
              .join(" | ") || null,
        }),
      ),
    );
    qc.invalidateQueries({ queryKey: ["dose-logs"] });
    qc.invalidateQueries({ queryKey: ["prescriptions"] });
    setSaving(false);
    setSubmitted(true);
  };

  return (
    <div className="px-5 pb-6 pt-6">
      <button
        onClick={() => navigate({ to: "/app" })}
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Home
      </button>

      {submitted ? (
        <SubmittedCard onDone={() => navigate({ to: "/app" })} />
      ) : (
        <>
          <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">Today's check-in</h1>
          <p className="mt-1 text-sm text-muted-foreground">Takes about one minute.</p>

          <Stepper steps={steps} current={step} />

          <section className="surface-card mt-6 p-6">
            {step === 0 && (
              <div>
                <h2 className="font-display text-lg font-semibold">Your prescribed doses</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Confirm each one — this is what your clinician reviews.
                </p>
                {prescriptions.isLoading && (
                  <div className="mt-5 space-y-3">
                    {[0, 1].map((i) => (
                      <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
                    ))}
                  </div>
                )}
                {!prescriptions.isLoading && active.length === 0 && (
                  <p className="mt-5 rounded-xl border border-border p-4 text-sm text-muted-foreground">
                    No active prescriptions on file yet.
                  </p>
                )}
                <ul className="mt-5 space-y-3">
                  {active.map((p) => {
                    const slot = currentSlot(p, now);
                    const status = statuses[p.id];
                    return (
                      <li key={p.id} className="rounded-xl border border-border p-4">
                        <div className="flex items-start gap-3">
                          <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-primary-soft text-primary">
                            <Pill className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-display text-sm font-semibold text-foreground">
                              {p.medication_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {p.dosage_mg} · {p.pills_per_dose} pill{p.pills_per_dose > 1 ? "s" : ""} ·
                              scheduled {slot}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setStatuses((s) => ({ ...s, [p.id]: "taken" }))}
                            className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                              status === "taken"
                                ? "border-success bg-success text-success-foreground"
                                : "border-border text-foreground hover:bg-primary-soft/50"
                            }`}
                          >
                            <Check className="h-4 w-4" /> Taken
                          </button>
                          <button
                            onClick={() => setStatuses((s) => ({ ...s, [p.id]: "missed" }))}
                            className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                              status === "missed"
                                ? "border-warning bg-warning/15 text-warning"
                                : "border-border text-foreground hover:bg-warning/5"
                            }`}
                          >
                            <X className="h-4 w-4" /> Missed
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-4 text-xs text-muted-foreground">
                  Logged at {fmtClock(now)} in your dose timezone.
                </p>
              </div>
            )}
            {step === 1 && (
              <div>
                <h2 className="font-display text-lg font-semibold">Pills left</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Count what's in each pack. We use this to order a refill before you run out.
                </p>
                <ul className="mt-5 space-y-3">
                  {active.map((p) => {
                    const left = Number(counts[p.id]);
                    const hasValue = counts[p.id] !== undefined && counts[p.id] !== "";
                    const days = hasValue ? daysOfSupply(left, dailyDoseRate(p)) : null;
                    return (
                      <li key={p.id} className="rounded-xl border border-border p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-display text-sm font-semibold">{p.medication_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {dailyDoseRate(p)} pills a day · last record {p.current_pill_count}
                            </p>
                          </div>
                          <input
                            inputMode="numeric"
                            aria-label={`Pills left for ${p.medication_name}`}
                            value={counts[p.id] ?? ""}
                            onChange={(e) =>
                              setCounts((c) => ({ ...c, [p.id]: e.target.value.replace(/\D/g, "").slice(0, 4) }))
                            }
                            placeholder="0"
                            className="w-20 rounded-lg border border-input bg-background px-3 py-2 text-center font-display text-lg font-semibold outline-none ring-ring focus:ring-2"
                          />
                        </div>
                        {days !== null && (
                          <p
                            className={`mt-2 text-xs ${days <= REFILL_THRESHOLD_DAYS ? "font-semibold text-destructive" : "text-muted-foreground"}`}
                          >
                            About {days} day{days === 1 ? "" : "s"} left
                            {days <= REFILL_THRESHOLD_DAYS && " — a refill request will be sent to your pharmacy."}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-6 rounded-xl bg-muted/60 p-4">
                  <p className="text-sm font-medium text-foreground">Caregiver confirmation</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Ask your caregiver to enter their 4-digit PIN to confirm today's doses.
                  </p>
                  <input
                    type="password"
                    inputMode="numeric"
                    aria-label="Caregiver PIN"
                    disabled={noCaregiver}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="••••"
                    className="mt-3 w-32 rounded-lg border border-input bg-background px-3 py-2 text-center tracking-[0.5em] outline-none ring-ring focus:ring-2 disabled:opacity-50"
                  />
                  <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <input type="checkbox" checked={noCaregiver} onChange={(e) => setNoCaregiver(e.target.checked)} />
                    No caregiver with me today
                  </label>
                </div>
              </div>
            )}
            {step === 2 && (
              <>
                <VoiceCaptureCard onSaved={() => setVoiceOk(true)} />
                <label className="mt-8 block">
                  <span className="text-sm font-medium text-foreground">Anything else? (optional)</span>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder="Optional note…"
                    className="mt-1.5 w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus:border-ring focus:ring-2"
                  />
                </label>
              </>
            )}
          </section>

          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground disabled:opacity-40"
            >
              Back
            </button>
            {step < steps.length - 1 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canNext}
                className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-card)] disabled:opacity-40"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={() => void submit()}
                disabled={!canNext || saving}
                className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-card)] disabled:opacity-40"
              >
                {saving ? "Saving…" : "Submit check-in"}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="mt-6 flex items-center gap-2">
      {steps.map((label, i) => {
        const state = i < current ? "done" : i === current ? "active" : "idle";
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={`grid h-7 w-7 flex-none place-items-center rounded-full text-xs font-semibold ${
                state === "done"
                  ? "bg-success text-success-foreground"
                  : state === "active"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {state === "done" ? "✓" : i + 1}
            </span>
            <span className={`text-xs font-medium ${state === "idle" ? "text-muted-foreground" : "text-foreground"}`}>
              {label}
            </span>
            {i < steps.length - 1 && <span className="ml-1 h-px flex-1 bg-border" />}
          </li>
        );
      })}
    </ol>
  );
}

function SubmittedCard({ onDone }: { onDone: () => void }) {
  return (
    <div className="surface-card mt-10 p-8 text-center">
      <div
        className="mx-auto grid h-16 w-16 place-items-center rounded-full text-primary-foreground"
        style={{ background: "var(--gradient-primary)" }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-8 w-8">
          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h2 className="mt-5 font-display text-2xl font-semibold">Check-in received</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Doses logged and your voice sample is queued for analysis.
      </p>
      <button
        onClick={onDone}
        className="mt-6 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-card)]"
      >
        Done
      </button>
    </div>
  );
}
