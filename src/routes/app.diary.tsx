import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NotebookPen, MessageSquareQuote, AlertTriangle, Check } from "lucide-react";
import {
  createSymptomDiary,
  listClinicianNotes,
  listSymptomDiaries,
} from "@/lib/api/client";
import { SYMPTOM_SCALE_LABEL } from "@/lib/api/types";
import { PatientSkeleton } from "@/components/patient/PatientSkeleton";
import { PatientError } from "@/components/patient/PatientError";

export const Route = createFileRoute("/app/diary")({
  head: () => ({
    meta: [
      { title: "Symptom diary — NeuroTrack" },
      {
        name: "description",
        content:
          "Log how you feel each day — tremor, stiffness, slowness, falls — and read your clinician's notes.",
      },
      { property: "og:title", content: "Symptom diary — NeuroTrack" },
      {
        property: "og:description",
        content: "Your daily symptom log, shared with your Cimas clinician.",
      },
    ],
  }),
  pendingMs: 150,
  pendingMinMs: 300,
  pendingComponent: PatientSkeleton,
  errorComponent: PatientError,
  component: Diary,
});

const SCALES = [
  { key: "tremor_severity", label: "Tremor" },
  { key: "muscle_stiffness", label: "Stiffness" },
  { key: "slowness_of_movement", label: "Slowness of movement" },
] as const;

function Diary() {
  const qc = useQueryClient();
  const entries = useQuery({ queryKey: ["symptom-diaries", 1], queryFn: () => listSymptomDiaries(1) });
  const notes = useQuery({ queryKey: ["clinician-notes", 1], queryFn: () => listClinicianNotes({ patientId: 1 }) });

  const [form, setForm] = useState({
    tremor_severity: 2,
    muscle_stiffness: 2,
    slowness_of_movement: 2,
    had_accidental_fall: false,
    wearing_off_episode: false,
    patient_notes: "",
  });
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: () =>
      createSymptomDiary({
        patient_id: 1,
        tremor_severity: form.tremor_severity,
        muscle_stiffness: form.muscle_stiffness,
        slowness_of_movement: form.slowness_of_movement,
        had_accidental_fall: form.had_accidental_fall,
        wearing_off_episode: form.wearing_off_episode,
        patient_notes: form.patient_notes.trim() || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["symptom-diaries"] });
      setSaved(true);
      setForm((f) => ({ ...f, had_accidental_fall: false, wearing_off_episode: false, patient_notes: "" }));
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const visibleNotes = (notes.data ?? []).filter((n) => n.visible_to_patient);

  return (
    <div className="px-5 pb-6 pt-6">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
          <NotebookPen className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Symptom diary</h1>
          <p className="text-sm text-muted-foreground">How are you feeling today?</p>
        </div>
      </div>

      {/* Log form */}
      <section className="surface-card mt-5 p-5">
        <div className="space-y-5">
          {SCALES.map((s) => (
            <div key={s.key}>
              <div className="flex items-baseline justify-between">
                <label className="text-sm font-medium text-foreground">{s.label}</label>
                <span className="text-xs text-muted-foreground">
                  {SYMPTOM_SCALE_LABEL[form[s.key]]}
                </span>
              </div>
              <div className="mt-2 flex gap-2">
                {[1, 2, 3, 4, 5].map((v) => {
                  const active = form[s.key] === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      aria-label={`${s.label}: ${SYMPTOM_SCALE_LABEL[v]}`}
                      onClick={() => setForm((f) => ({ ...f, [s.key]: v }))}
                      className={`h-11 flex-1 rounded-xl border text-sm font-semibold transition ${
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {v}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="space-y-2">
            {[
              { key: "had_accidental_fall" as const, label: "I had a fall today" },
              { key: "wearing_off_episode" as const, label: "My medication wore off early" },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                aria-pressed={form[t.key]}
                onClick={() => setForm((f) => ({ ...f, [t.key]: !f[t.key] }))}
                className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${
                  form[t.key]
                    ? "border-warning bg-warning/10 text-warning-foreground"
                    : "border-border bg-card text-foreground hover:border-primary/40"
                }`}
              >
                <span
                  className={`grid h-5 w-5 flex-none place-items-center rounded-md border ${
                    form[t.key] ? "border-warning bg-warning text-warning-foreground" : "border-border"
                  }`}
                >
                  {form[t.key] && <Check className="h-3.5 w-3.5" />}
                </span>
                {t.label}
              </button>
            ))}
          </div>

          <div>
            <label htmlFor="diary-notes" className="text-sm font-medium">
              Anything else you want your clinician to know?
            </label>
            <textarea
              id="diary-notes"
              value={form.patient_notes}
              maxLength={1000}
              onChange={(e) => setForm((f) => ({ ...f, patient_notes: e.target.value }))}
              rows={3}
              placeholder="In your own words…"
              className="mt-2 w-full rounded-xl border border-border bg-card p-3 text-sm outline-none focus:border-primary"
            />
          </div>

          <button
            type="button"
            disabled={save.isPending}
            onClick={() => save.mutate()}
            className="w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-card)] disabled:opacity-60"
          >
            {save.isPending ? "Saving…" : saved ? "Saved ✓" : "Save today's entry"}
          </button>
          {form.had_accidental_fall && (
            <p className="text-xs text-warning-foreground">
              Falls are sent to your Cimas clinician straight away.
            </p>
          )}
        </div>
      </section>

      {/* Clinician notes */}
      <section className="mt-7">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Notes from your clinician
        </h2>
        {visibleNotes.length === 0 ? (
          <p className="mt-3 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            No notes yet. Your clinician's replies to your diary appear here.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {visibleNotes.map((n) => (
              <li key={n.id} className="surface-card p-4">
                <div className="flex items-center gap-2">
                  <MessageSquareQuote className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold">{n.clinician_name}</p>
                  <span className="ml-auto text-[11px] text-muted-foreground">
                    {fmt(n.created_at)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-foreground">{n.note}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* History */}
      <section className="mt-7">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Your entries
        </h2>
        <ul className="mt-3 space-y-2">
          {(entries.data ?? []).map((e) => (
            <li key={e.id} className="surface-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{fmt(e.timestamp)}</p>
                {e.had_accidental_fall && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-destructive">
                    <AlertTriangle className="h-3 w-3" /> Fall
                  </span>
                )}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                {SCALES.map((s) => (
                  <div key={s.key} className="rounded-lg bg-muted/60 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
                    <p className="font-display text-lg font-semibold">{e[s.key]}</p>
                  </div>
                ))}
              </div>
              {e.wearing_off_episode && (
                <p className="mt-2 text-xs text-warning-foreground">Wearing-off episode reported</p>
              )}
              {e.patient_notes && (
                <p className="mt-2 text-sm text-muted-foreground">"{e.patient_notes}"</p>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
