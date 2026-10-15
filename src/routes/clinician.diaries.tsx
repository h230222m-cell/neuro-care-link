import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, MessageSquareQuote, NotebookPen } from "lucide-react";
import {
  createClinicianNote,
  listAllSymptomDiaries,
  listClinicianNotes,
  patientName,
} from "@/lib/api/client";
import { SYMPTOM_SCALE_LABEL } from "@/lib/api/types";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/clinician/diaries")({
  head: () => ({
    meta: [
      { title: "Symptom diaries — NeuroTrack Clinician" },
      {
        name: "description",
        content:
          "Review patient-reported symptom diaries and add notes that patients can read in their app.",
      },
      { property: "og:title", content: "Symptom diaries — NeuroTrack Clinician" },
      { property: "og:description", content: "Patient-reported symptoms with clinician replies." },
    ],
  }),
  component: Diaries,
});

const SCALES = [
  { key: "tremor_severity", label: "Tremor" },
  { key: "muscle_stiffness", label: "Stiffness" },
  { key: "slowness_of_movement", label: "Slowness" },
] as const;

function Diaries() {
  const diaries = useQuery({ queryKey: ["symptom-diaries", "all"], queryFn: listAllSymptomDiaries });
  const notes = useQuery({ queryKey: ["clinician-notes", "all"], queryFn: () => listClinicianNotes() });

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Symptom diaries</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Patient-reported entries. Notes you add are visible to the patient in their app.
          </p>
        </div>
      </div>

      <ul className="mt-6 space-y-4">
        {(diaries.data ?? []).map((d) => (
          <li key={d.id} className="surface-card p-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
                <NotebookPen className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="font-display text-base font-semibold">{patientName(d.patient_id)}</p>
                <p className="text-xs text-muted-foreground">{fmt(d.timestamp)}</p>
              </div>
              {d.had_accidental_fall && (
                <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-destructive">
                  <AlertTriangle className="h-3 w-3" /> Fall reported
                </span>
              )}
              {d.wearing_off_episode && (
                <span className="rounded-full bg-warning/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-warning-foreground">
                  Wearing off
                </span>
              )}
              <Link
                to="/clinician/patients/$id"
                params={{ id: `p${d.patient_id}` }}
                className="ml-auto text-xs font-semibold text-primary hover:underline"
              >
                Open patient
              </Link>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {SCALES.map((s) => (
                <div key={s.key} className="rounded-lg bg-muted/60 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
                  <p className="font-display text-lg font-semibold">
                    {d[s.key]}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      {SYMPTOM_SCALE_LABEL[d[s.key]]}
                    </span>
                  </p>
                </div>
              ))}
            </div>

            {d.patient_notes && (
              <p className="mt-3 rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">
                "{d.patient_notes}"
              </p>
            )}

            <NoteThread
              diaryId={d.id}
              patientId={d.patient_id}
              notes={(notes.data ?? []).filter((n) => n.diary === d.id)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function NoteThread({
  diaryId,
  patientId,
  notes,
}: {
  diaryId: number;
  patientId: number;
  notes: Array<{ id: number; clinician_name: string; note: string; created_at: string; visible_to_patient: boolean }>;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [visible, setVisible] = useState(true);

  const add = useMutation({
    mutationFn: () =>
      createClinicianNote({
        diary: diaryId,
        patient_id: patientId,
        note: text.trim(),
        clinician_name: user?.name ?? "Care team",
        visible_to_patient: visible,
      }),
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["clinician-notes"] });
    },
  });

  return (
    <div className="mt-4 border-t border-border pt-4">
      {notes.length > 0 && (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="rounded-lg bg-primary-soft/40 p-3">
              <div className="flex items-center gap-2">
                <MessageSquareQuote className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">{n.clinician_name}</p>
                <span className="text-[11px] text-muted-foreground">{fmt(n.created_at)}</span>
                <span
                  className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                    n.visible_to_patient
                      ? "bg-success/15 text-success-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {n.visible_to_patient ? "Shared with patient" : "Internal"}
                </span>
              </div>
              <p className="mt-1.5 text-sm">{n.note}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3">
        <label htmlFor={`note-${diaryId}`} className="text-xs font-medium text-muted-foreground">
          Add a clinical note
        </label>
        <textarea
          id={`note-${diaryId}`}
          value={text}
          maxLength={1000}
          rows={2}
          onChange={(e) => setText(e.target.value)}
          placeholder="Guidance, follow-up plan, or what you actioned…"
          className="mt-1.5 w-full rounded-xl border border-border bg-card p-3 text-sm outline-none focus:border-primary"
        />
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={visible}
              onChange={(e) => setVisible(e.target.checked)}
              className="h-4 w-4 accent-[var(--color-primary)]"
            />
            Show this note to the patient
          </label>
          <button
            type="button"
            disabled={!text.trim() || add.isPending}
            onClick={() => add.mutate()}
            className="ml-auto rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            {add.isPending ? "Saving…" : "Save note"}
          </button>
        </div>
      </div>
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
