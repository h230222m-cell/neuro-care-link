import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/checkin")({
  head: () => ({
    meta: [
      { title: "Daily check-in — NeuroTrack" },
      { name: "description", content: "Confirm medication, record a voice sample, and log symptoms." },
      { property: "og:title", content: "Daily check-in — NeuroTrack" },
      { property: "og:description", content: "Under two minutes." },
    ],
  }),
  component: CheckIn,
});

type MedStatus = "taken" | "missed" | null;
interface Diary {
  tremor: number;
  stiffness: number;
  balance: number;
  falls: number;
  notes: string;
}

function CheckIn() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [med, setMed] = useState<MedStatus>(null);
  const [diary, setDiary] = useState<Diary>({ tremor: 2, stiffness: 2, balance: 3, falls: 0, notes: "" });
  const [voiceOk, setVoiceOk] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const steps = ["Medication", "Voice sample", "Symptom diary"];
  const canNext = [med !== null, voiceOk, true][step];

  const submit = () => {
    const payload = { at: new Date().toISOString(), med, diary, voiceOk, userId: user?.id };
    const prev = JSON.parse(localStorage.getItem("neurotrack.checkins") ?? "[]");
    localStorage.setItem("neurotrack.checkins", JSON.stringify([payload, ...prev].slice(0, 30)));
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
          <p className="mt-1 text-sm text-muted-foreground">Takes about two minutes.</p>

          <Stepper steps={steps} current={step} />

          <section className="surface-card mt-6 p-6">
            {step === 0 && <MedicationStep value={med} onChange={setMed} />}
            {step === 1 && <VoiceStep done={voiceOk} onDone={() => setVoiceOk(true)} />}
            {step === 2 && <DiaryStep value={diary} onChange={setDiary} />}
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
                onClick={submit}
                className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-card)]"
              >
                Submit check-in
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

function MedicationStep({ value, onChange }: { value: MedStatus; onChange: (v: MedStatus) => void }) {
  return (
    <div>
      <h2 className="font-display text-lg font-semibold">Morning Levodopa · 8:00 AM</h2>
      <p className="mt-1 text-sm text-muted-foreground">Did you take your morning dose?</p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          onClick={() => onChange("taken")}
          className={`rounded-xl border p-4 text-left transition ${
            value === "taken" ? "border-primary bg-primary-soft" : "border-border bg-card hover:bg-primary-soft/50"
          }`}
        >
          <div className="text-2xl">✅</div>
          <div className="mt-2 font-semibold text-foreground">Taken</div>
          <div className="text-xs text-muted-foreground">Logged with the current time</div>
        </button>
        <button
          onClick={() => onChange("missed")}
          className={`rounded-xl border p-4 text-left transition ${
            value === "missed" ? "border-warning bg-warning/10" : "border-border bg-card hover:bg-warning/5"
          }`}
        >
          <div className="text-2xl">⏭️</div>
          <div className="mt-2 font-semibold text-foreground">Missed</div>
          <div className="text-xs text-muted-foreground">We'll flag this for your clinician</div>
        </button>
      </div>
    </div>
  );
}

function VoiceStep({ done, onDone }: { done: boolean; onDone: () => void }) {
  const [state, setState] = useState<"idle" | "recording" | "done" | "denied">(done ? "done" : "idle");
  const [seconds, setSeconds] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = () => {
    recRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
  };
  useEffect(() => () => stop(), []);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream);
      recRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => chunksRef.current.push(e.data);
      rec.onstop = () => { setState("done"); onDone(); };
      rec.start();
      setState("recording");
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= 10) { stop(); return 10; }
          return s + 1;
        });
      }, 1000);
    } catch { setState("denied"); }
  };

  return (
    <div className="text-center">
      <h2 className="font-display text-lg font-semibold">Say "aaah" for 10 seconds</h2>
      <p className="mt-1 text-sm text-muted-foreground">Hold a steady vowel — we track subtle changes over time.</p>
      <div className="mt-8 flex flex-col items-center">
        <button
          onClick={state === "recording" ? stop : start}
          disabled={state === "done"}
          className={`grid h-28 w-28 place-items-center rounded-full text-primary-foreground transition ${
            state === "recording" ? "animate-pulse bg-destructive" : "bg-primary hover:opacity-95"
          } disabled:bg-success`}
          style={state !== "recording" && state !== "done" ? { background: "var(--gradient-primary)" } : undefined}
        >
          {state === "done" ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-10 w-10"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-10 w-10">
              <rect x="9" y="3" width="6" height="12" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" strokeLinecap="round" />
            </svg>
          )}
        </button>
        <div className="mt-4 text-sm font-medium text-foreground">
          {state === "idle" && "Tap to start"}
          {state === "recording" && `Recording… ${seconds}s / 10s`}
          {state === "done" && "Sample captured ✓"}
          {state === "denied" && <span className="text-destructive">Microphone blocked.</span>}
        </div>
      </div>
    </div>
  );
}

function DiaryStep({ value, onChange }: { value: Diary; onChange: (v: Diary) => void }) {
  const rows: Array<{ key: keyof Diary; label: string; max: number; hint: string }> = [
    { key: "tremor", label: "Tremor today", max: 5, hint: "0 = none · 5 = severe" },
    { key: "stiffness", label: "Stiffness", max: 5, hint: "0 = none · 5 = severe" },
    { key: "balance", label: "Balance / walking", max: 5, hint: "0 = very unsteady · 5 = normal" },
    { key: "falls", label: "Falls in last 24h", max: 4, hint: "" },
  ];
  return (
    <div>
      <h2 className="font-display text-lg font-semibold">How has today felt?</h2>
      <p className="mt-1 text-sm text-muted-foreground">Quick self-rating — no wrong answers.</p>
      <div className="mt-6 space-y-5">
        {rows.map((r) => (
          <div key={r.key}>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-foreground">{r.label}</span>
              <span className="text-sm font-semibold text-primary">{value[r.key] as number}</span>
            </div>
            <div className="mt-2 flex gap-1.5">
              {Array.from({ length: r.max + 1 }).map((_, i) => {
                const active = (value[r.key] as number) >= i;
                return (
                  <button
                    key={i}
                    onClick={() => onChange({ ...value, [r.key]: i })}
                    className={`h-8 flex-1 rounded-md border transition ${
                      active ? "border-primary bg-primary" : "border-border bg-muted hover:bg-primary-soft"
                    }`}
                    aria-label={`${r.label} ${i}`}
                  />
                );
              })}
            </div>
            {r.hint && <p className="mt-1 text-xs text-muted-foreground">{r.hint}</p>}
          </div>
        ))}
        <label className="block">
          <span className="text-sm font-medium text-foreground">Anything else?</span>
          <textarea
            value={value.notes}
            onChange={(e) => onChange({ ...value, notes: e.target.value })}
            maxLength={500}
            rows={3}
            placeholder="Optional — dizziness, sleep, mood…"
            className="mt-1.5 w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus:border-ring focus:ring-2"
          />
        </label>
      </div>
    </div>
  );
}

function SubmittedCard({ onDone }: { onDone: () => void }) {
  return (
    <div className="surface-card mt-10 p-8 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-8 w-8"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
      <h2 className="mt-5 font-display text-2xl font-semibold">Check-in received</h2>
      <p className="mt-2 text-sm text-muted-foreground">Your Cimas care team will only reach out if something needs attention.</p>
      <button onClick={onDone} className="mt-6 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-card)]">Done</button>
    </div>
  );
}
