// Central mock data for the NeuroTrack prototype.
// Swap for real API calls (Django REST + FastAPI voice service) later —
// the shapes here are close to the eventual DTOs.

export interface CheckIn {
  date: string; // YYYY-MM-DD
  medTaken: boolean;
  medTime?: string;
  voice: { stability: number }; // 0..1
  notes?: string;
}

export interface Medication {
  id: string;
  name: string;
  dose: string;
  times: string[]; // "08:00"
  nextDue: string; // ISO
  supplyDays: number;
  adherence7d: number; // 0..1
}

export interface Appointment {
  id: string;
  title: string;
  clinician: string;
  when: string; // ISO
  location: string;
  status: "scheduled" | "completed" | "cancelled";
}

export interface PatientSummary {
  id: string;
  name: string;
  age: number;
  gender: "F" | "M";
  location: string;
  tier: "stable" | "tier2" | "tier1";
  adherence7d: number;
  lastCheckIn: string; // ISO
  voiceTrend: number[]; // last 14 stability scores 0..1
  flag?: string;
}

export interface Alert {
  id: string;
  patientId: string;
  patientName: string;
  tier: "tier1" | "tier2";
  reason: string;
  at: string;
  acknowledged: boolean;
}

// ---- Patient (Tendai) ----

const today = new Date();
const daysAgo = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};
const hoursFromNow = (h: number) => {
  const d = new Date(today);
  d.setHours(d.getHours() + h);
  return d.toISOString();
};

export const patientCheckins: CheckIn[] = Array.from({ length: 14 }, (_, i) => ({
  date: daysAgo(13 - i),
  medTaken: [1, 3, 8].includes(13 - i) ? false : true,
  medTime: "08:12",
  voice: {
    stability: 0.88 - i * 0.012 + Math.sin(i) * 0.02,
  },
  notes: i === 11 ? "Voice felt hoarse this morning." : undefined,
}));

export const patientMedications: Medication[] = [
  {
    id: "m1",
    name: "Levodopa / Carbidopa",
    dose: "250 / 25 mg",
    times: ["08:00", "13:00", "18:00"],
    nextDue: hoursFromNow(2),
    supplyDays: 9,
    adherence7d: 0.86,
  },
  {
    id: "m2",
    name: "Selegiline",
    dose: "5 mg",
    times: ["08:00"],
    nextDue: hoursFromNow(2),
    supplyDays: 21,
    adherence7d: 1,
  },
  {
    id: "m3",
    name: "Vitamin D3",
    dose: "1000 IU",
    times: ["20:00"],
    nextDue: hoursFromNow(9),
    supplyDays: 40,
    adherence7d: 0.71,
  },
];

export const patientAppointments: Appointment[] = [
  {
    id: "a1",
    title: "Neurology follow-up",
    clinician: "Dr. Chikafu",
    when: hoursFromNow(24 * 6 + 2),
    location: "Cimas Borrowdale",
    status: "scheduled",
  },
  {
    id: "a3",
    title: "Neurology follow-up",
    clinician: "Dr. Chikafu",
    when: hoursFromNow(-24 * 45),
    location: "Cimas Borrowdale",
    status: "completed",
  },
];

// ---- Clinician (Dr. Chikafu) ----

export const roster: PatientSummary[] = [
  {
    id: "p1",
    name: "Tendai Moyo",
    age: 68,
    gender: "M",
    location: "Harare · Borrowdale",
    tier: "tier1",
    adherence7d: 0.4,
    lastCheckIn: hoursFromNow(-6),
    voiceTrend: [0.88, 0.87, 0.86, 0.85, 0.86, 0.84, 0.82, 0.81, 0.79, 0.78, 0.75, 0.72, 0.71, 0.69],
    flag: "Voice stability −18% vs baseline · 3 missed doses",
  },
  {
    id: "p2",
    name: "Grace Ncube",
    age: 72,
    gender: "F",
    location: "Bulawayo",
    tier: "tier2",
    adherence7d: 0.86,
    lastCheckIn: hoursFromNow(-14),
    voiceTrend: [0.9, 0.9, 0.89, 0.88, 0.88, 0.87, 0.86, 0.85, 0.85, 0.84, 0.83, 0.83, 0.82, 0.81],
    flag: "Voice stability declining over 10 days",
  },
  {
    id: "p3",
    name: "Farai Dube",
    age: 61,
    gender: "M",
    location: "Mutare",
    tier: "tier2",
    adherence7d: 0.57,
    lastCheckIn: hoursFromNow(-30),
    voiceTrend: [0.86, 0.85, 0.85, 0.86, 0.86, 0.85, 0.85, 0.84, 0.85, 0.85, 0.84, 0.85, 0.85, 0.84],
    flag: "Missed 3 morning doses this week",
  },
  {
    id: "p4",
    name: "Chiedza Sithole",
    age: 66,
    gender: "F",
    location: "Harare · Avondale",
    tier: "stable",
    adherence7d: 0.97,
    lastCheckIn: hoursFromNow(-4),
    voiceTrend: [0.9, 0.9, 0.91, 0.9, 0.9, 0.9, 0.91, 0.9, 0.91, 0.9, 0.91, 0.9, 0.9, 0.91],
  },
  {
    id: "p5",
    name: "Kudakwashe Banda",
    age: 74,
    gender: "M",
    location: "Gweru",
    tier: "stable",
    adherence7d: 0.93,
    lastCheckIn: hoursFromNow(-22),
    voiceTrend: [0.83, 0.83, 0.84, 0.84, 0.83, 0.84, 0.84, 0.85, 0.84, 0.85, 0.84, 0.85, 0.85, 0.85],
  },
  {
    id: "p6",
    name: "Nyasha Mupfumira",
    age: 58,
    gender: "F",
    location: "Harare · Highlands",
    tier: "stable",
    adherence7d: 0.9,
    lastCheckIn: hoursFromNow(-2),
    voiceTrend: [0.89, 0.89, 0.89, 0.9, 0.89, 0.89, 0.89, 0.9, 0.89, 0.89, 0.9, 0.89, 0.9, 0.9],
  },
];

export const alerts: Alert[] = [
  {
    id: "al1",
    patientId: "p1",
    patientName: "Tendai Moyo",
    tier: "tier1",
    reason: "Sharp voice-stability drop with missed morning doses.",
    at: hoursFromNow(-5),
    acknowledged: false,
  },
  {
    id: "al2",
    patientId: "p2",
    patientName: "Grace Ncube",
    tier: "tier2",
    reason: "Voice stability declining over 10 days.",
    at: hoursFromNow(-26),
    acknowledged: false,
  },
  {
    id: "al3",
    patientId: "p3",
    patientName: "Farai Dube",
    tier: "tier2",
    reason: "Adherence 57% (was 92% baseline).",
    at: hoursFromNow(-52),
    acknowledged: true,
  },
];

// ---- Helpers ----

export function tierLabel(t: PatientSummary["tier"]) {
  return t === "tier1" ? "Tier 1 · urgent" : t === "tier2" ? "Tier 2 · review" : "Stable";
}

export function fmtRelative(iso: string) {
  const diffMs = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const mins = Math.round(abs / 60000);
  if (mins < 60) return diffMs < 0 ? `${mins}m ago` : `in ${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return diffMs < 0 ? `${hrs}h ago` : `in ${hrs}h`;
  const days = Math.round(hrs / 24);
  return diffMs < 0 ? `${days}d ago` : `in ${days}d`;
}
