import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square, RotateCcw, Play, Pause, Check, AlertTriangle, Loader2 } from "lucide-react";
import {
  VoiceRecorder as Engine,
  VOICE_MIN_SECONDS,
  VOICE_TARGET_SECONDS,
  assessCapture,
  recordVoiceSample,
  type VoiceCapture,
} from "@/lib/voice";
import { uploadVoiceSample } from "@/lib/api/client";

type Phase = "idle" | "arming" | "recording" | "review" | "uploading" | "saved" | "denied";

const BARS = 28;

/**
 * Sustained-vowel capture: live level meter, 10s guided take, playback review
 * and retake. Produces 16 kHz mono WAV so the acoustic backend can decode it.
 */
export function VoiceCaptureCard({ onSaved }: { onSaved?: (c: VoiceCapture) => void }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const [history, setHistory] = useState<number[]>(() => Array(BARS).fill(0));
  const [capture, setCapture] = useState<VoiceCapture | null>(null);
  const [issue, setIssue] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  const engineRef = useRef<Engine | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  useEffect(
    () => () => {
      clearTimer();
      engineRef.current?.cancel();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  const finish = useCallback(async () => {
    clearTimer();
    const engine = engineRef.current;
    if (!engine) return;
    engineRef.current = null;
    const take = await engine.stop();
    setLevel(0);
    setCapture(take);
    const quality = assessCapture(take);
    setIssue(quality.ok ? null : (quality.reason ?? null));
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = URL.createObjectURL(take.blob);
    setPhase("review");
  }, []);

  const start = async () => {
    setIssue(null);
    setCapture(null);
    setHistory(Array(BARS).fill(0));
    setElapsed(0);
    setPhase("arming");
    const engine = new Engine();
    try {
      await engine.start((l) => {
        setLevel(l);
        setHistory((h) => [...h.slice(1), l]);
      });
    } catch {
      setPhase("denied");
      return;
    }
    engineRef.current = engine;
    setPhase("recording");
    timerRef.current = setInterval(() => {
      const secs = engine.elapsedSeconds;
      setElapsed(secs);
      if (secs >= VOICE_TARGET_SECONDS) void finish();
    }, 100);
  };

  const save = async () => {
    if (!capture) return;
    setPhase("uploading");
    const res = await uploadVoiceSample(capture.blob, {
      duration_sec: capture.durationSec,
      sample_rate: capture.sampleRate,
      mean_level: capture.meanLevel,
    });
    recordVoiceSample({
      at: new Date().toISOString(),
      duration_sec: Math.round(capture.durationSec * 10) / 10,
      sample_rate: capture.sampleRate,
      mean_level: capture.meanLevel,
      bytes: capture.blob.size,
      uploaded: res.uploaded,
    });
    setPhase("saved");
    onSaved?.(capture);
  };

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play();
      setPlaying(true);
    } else {
      el.pause();
      setPlaying(false);
    }
  };

  const progress = Math.min(1, elapsed / VOICE_TARGET_SECONDS);
  const recording = phase === "recording";

  return (
    <div className="text-center">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Voice sample</p>
      <h2 className="mt-1 font-display text-xl font-semibold tracking-tight">
        Say &ldquo;aaah&rdquo; steadily
      </h2>
      <p className="mx-auto mt-1.5 max-w-xs text-sm text-muted-foreground">
        Hold one long vowel for {VOICE_TARGET_SECONDS} seconds in a quiet room, about a hand&rsquo;s
        width from your phone.
      </p>

      {/* Meter */}
      <div className="relative mx-auto mt-7 flex h-24 w-full max-w-sm items-center justify-center gap-[3px]">
        {history.map((v, i) => (
          <span
            key={i}
            className={`w-full flex-1 rounded-full transition-[height] duration-100 ${
              recording ? "bg-primary" : "bg-muted"
            }`}
            style={{ height: `${Math.max(6, v * 96)}%`, opacity: recording ? 0.45 + v * 0.55 : 0.6 }}
          />
        ))}
      </div>

      {/* Control */}
      <div className="mt-6 flex flex-col items-center">
        {phase !== "review" && phase !== "saved" && phase !== "uploading" ? (
          <button
            onClick={recording ? () => void finish() : () => void start()}
            disabled={phase === "arming"}
            aria-label={recording ? "Stop recording" : "Start recording"}
            className="relative grid h-24 w-24 place-items-center rounded-full text-primary-foreground shadow-[var(--shadow-card)] transition active:scale-95 disabled:opacity-60"
            style={{ background: recording ? "var(--destructive)" : "var(--gradient-primary)" }}
          >
            {recording && (
              <span
                className="absolute inset-0 rounded-full border-2 border-destructive/40"
                style={{ transform: `scale(${1 + level * 0.25})`, transition: "transform 100ms linear" }}
              />
            )}
            {phase === "arming" ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : recording ? (
              <Square className="h-7 w-7" />
            ) : (
              <Mic className="h-8 w-8" />
            )}
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              disabled={phase === "uploading"}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground disabled:opacity-50"
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {playing ? "Pause" : "Play back"}
            </button>
            <button
              onClick={() => void start()}
              disabled={phase === "uploading"}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" /> Retake
            </button>
          </div>
        )}

        {/* Progress / status */}
        <div className="mt-5 w-full max-w-xs">
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${issue ? "bg-warning" : "bg-primary"}`}
              style={{ width: `${(capture ? 1 : progress) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-sm font-medium tabular-nums text-foreground">
            {phase === "idle" && "Tap the mic to begin"}
            {phase === "arming" && "Getting the microphone ready…"}
            {recording &&
              `${elapsed.toFixed(1)}s / ${VOICE_TARGET_SECONDS}s${
                elapsed < VOICE_MIN_SECONDS ? " · keep going" : ""
              }`}
            {phase === "review" && capture && `${capture.durationSec.toFixed(1)}s captured`}
            {phase === "uploading" && "Sending securely…"}
            {phase === "saved" && (
              <span className="inline-flex items-center gap-1.5 text-success">
                <Check className="h-4 w-4" /> Sample sent for analysis
              </span>
            )}
            {phase === "denied" && (
              <span className="text-destructive">
                Microphone blocked — allow access in your browser settings.
              </span>
            )}
          </p>
          {issue && (
            <p className="mt-2 inline-flex items-start gap-1.5 text-left text-xs text-warning">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none" /> {issue}
            </p>
          )}
        </div>

        {phase === "review" && (
          <button
            onClick={() => void save()}
            className="mt-5 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-card)]"
          >
            Use this sample
          </button>
        )}
      </div>

      <audio
        ref={audioRef}
        src={urlRef.current ?? undefined}
        onEnded={() => setPlaying(false)}
        className="hidden"
      />

      <p className="mt-6 text-[11px] leading-relaxed text-muted-foreground">
        Recorded as 16 kHz mono WAV and sent over an encrypted connection to your care team.
        Nothing is shared with anyone else.
      </p>
    </div>
  );
}
