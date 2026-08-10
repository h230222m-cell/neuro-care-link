// Voice capture engine for the sustained-vowel task.
//
// The acoustic backend (FastAPI) needs deterministic, decodable audio: 16 kHz
// mono 16-bit PCM WAV. Browser MediaRecorder output differs per engine
// (webm/opus on Chrome, fragmented mp4 on Safari) and is lossy, so we capture
// raw PCM with the Web Audio API and encode a complete WAV ourselves.

export const VOICE_TARGET_SECONDS = 10;
export const VOICE_MIN_SECONDS = 5;
export const VOICE_SAMPLE_RATE = 16000;

export interface VoiceCapture {
  blob: Blob;
  durationSec: number;
  sampleRate: number;
  /** Mean RMS level 0..1 across the take — used for a "too quiet" check. */
  meanLevel: number;
  /** Fraction of frames that clipped — used for a "too loud" check. */
  clipRatio: number;
}

export type VoiceQuality = { ok: boolean; reason?: string };

export function assessCapture(c: VoiceCapture): VoiceQuality {
  if (c.durationSec < VOICE_MIN_SECONDS)
    return { ok: false, reason: `Too short — hold the vowel for at least ${VOICE_MIN_SECONDS}s.` };
  if (c.meanLevel < 0.012) return { ok: false, reason: "Too quiet — move closer and try again." };
  if (c.clipRatio > 0.02) return { ok: false, reason: "Too loud — pull back a little and try again." };
  return { ok: true };
}

// ---- Recorder ----

type LevelListener = (level: number) => void;

export class VoiceRecorder {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private chunks: Float32Array[] = [];
  private levelSum = 0;
  private levelFrames = 0;
  private clipped = 0;
  private samples = 0;
  private onLevel: LevelListener | null = null;

  async start(onLevel?: LevelListener) {
    this.onLevel = onLevel ?? null;
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    const Ctx: typeof AudioContext =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.processor = this.ctx.createScriptProcessor(2048, 1, 1);
    this.chunks = [];
    this.levelSum = 0;
    this.levelFrames = 0;
    this.clipped = 0;
    this.samples = 0;

    this.processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      const copy = new Float32Array(input.length);
      copy.set(input);
      this.chunks.push(copy);
      this.samples += copy.length;

      let sumSq = 0;
      for (let i = 0; i < copy.length; i++) {
        const v = copy[i]!;
        sumSq += v * v;
        if (Math.abs(v) > 0.98) this.clipped++;
      }
      const rms = Math.sqrt(sumSq / copy.length);
      this.levelSum += rms;
      this.levelFrames++;
      this.onLevel?.(Math.min(1, rms * 4));
    };

    this.source.connect(this.processor);
    // Keep the graph alive without echoing the mic back to the speakers.
    const mute = this.ctx.createGain();
    mute.gain.value = 0;
    this.processor.connect(mute);
    mute.connect(this.ctx.destination);
  }

  get elapsedSeconds() {
    return this.ctx ? this.samples / this.ctx.sampleRate : 0;
  }

  /** Stops capture and returns the encoded WAV take. */
  async stop(): Promise<VoiceCapture> {
    const ctxRate = this.ctx?.sampleRate ?? VOICE_SAMPLE_RATE;
    this.processor?.disconnect();
    this.source?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    if (this.processor) this.processor.onaudioprocess = null;
    await this.ctx?.close().catch(() => undefined);
    this.ctx = null;

    const pcm = concat(this.chunks, this.samples);
    const resampled = resample(pcm, ctxRate, VOICE_SAMPLE_RATE);
    const blob = encodeWav(resampled, VOICE_SAMPLE_RATE);
    return {
      blob,
      durationSec: this.samples / ctxRate,
      sampleRate: VOICE_SAMPLE_RATE,
      meanLevel: this.levelFrames ? this.levelSum / this.levelFrames : 0,
      clipRatio: this.samples ? this.clipped / this.samples : 0,
    };
  }

  cancel() {
    this.processor?.disconnect();
    this.source?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.ctx?.close().catch(() => undefined);
    this.ctx = null;
  }
}

function concat(chunks: Float32Array[], total: number) {
  const out = new Float32Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

/** Linear-interpolation downsample to the backend's expected rate. */
function resample(input: Float32Array, from: number, to: number) {
  if (from === to || input.length === 0) return input;
  const ratio = from / to;
  const length = Math.floor(input.length / ratio);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const pos = i * ratio;
    const idx = Math.floor(pos);
    const frac = pos - idx;
    const a = input[idx] ?? 0;
    const b = input[idx + 1] ?? a;
    out[i] = a + (b - a) * frac;
  }
  return out;
}

/** 16-bit mono PCM WAV — the one container every backend can decode. */
export function encodeWav(samples: Float32Array, sampleRate: number) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]!));
    view.setInt16(offset, v < 0 ? v * 0x8000 : v * 0x7fff, true);
    offset += 2;
  }
  return new Blob([buffer], { type: "audio/wav" });
}

// ---- Local sample ledger (metadata only; audio goes to the backend) ----

export interface VoiceSampleRecord {
  id: string;
  at: string;
  duration_sec: number;
  sample_rate: number;
  mean_level: number;
  bytes: number;
  uploaded: boolean;
}

const KEY = "neurotrack.voiceSamples";

export function listVoiceSamples(): VoiceSampleRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as VoiceSampleRecord[]) : [];
  } catch {
    return [];
  }
}

export function recordVoiceSample(rec: Omit<VoiceSampleRecord, "id">) {
  const row: VoiceSampleRecord = { id: crypto.randomUUID(), ...rec };
  try {
    window.localStorage.setItem(KEY, JSON.stringify([row, ...listVoiceSamples()].slice(0, 40)));
  } catch {
    /* ignore */
  }
  return row;
}

/** True when a sample was captured today (drives the home check-in card). */
export function hasVoiceSampleToday(now = new Date()) {
  const day = now.toISOString().slice(0, 10);
  return listVoiceSamples().some((s) => s.at.slice(0, 10) === day);
}
