// Single data-access layer for the NeuroTrack backend.
//
// Today it resolves against in-memory demo rows shaped exactly like the Django
// tables. To go live, set VITE_API_BASE_URL and replace each function body with
// the matching DRF call — the endpoint paths are already written next to them.

import {
  daysSupplyRemaining,
  dailyDoseRate,
  type DoseComplianceLog,
  type DoseComplianceLogCreate,
  type Prescription,
  type RefillOrder,
  type RefillOrderCreate,
  nextDoseDue,
  type FallEvent,
  type SymptomDiary,
  type SymptomDiaryCreate,
  type ClinicianNote,
  type ClinicianNoteCreate,
} from "./types";

import { DEFAULT_DOSE_SCHEDULE, type DoseSchedule } from "../dose-schedule";

let doseScheduleStore: DoseSchedule = { ...DEFAULT_DOSE_SCHEDULE };

export const API_BASE_URL = import.meta.env["VITE_API_BASE_URL"] ?? "";

const DEMO_PATIENT_ID = 1;

const iso = (dayOffset: number, hour = 8, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

function withProps(
  row: Omit<Prescription, "daily_dose_rate" | "days_supply_remaining">,
): Prescription {
  return {
    ...row,
    daily_dose_rate: dailyDoseRate(row),
    days_supply_remaining: daysSupplyRemaining(row),
  };
}

const prescriptions: Prescription[] = [
  withProps({
    id: 1,
    patient_id: DEMO_PATIENT_ID,
    medication_name: "Levodopa / Carbidopa (Sinemet)",
    dosage_mg: "25mg / 100mg",
    total_dispensed_pills: 90,
    current_pill_count: 12,
    pills_per_dose: 1,
    doses_per_day: 3,
    refill_threshold_days: 5,
    auto_refill_triggered: true,
    is_active: true,
    created_at: iso(-38),
  }),
  withProps({
    id: 2,
    patient_id: DEMO_PATIENT_ID,
    medication_name: "Selegiline",
    dosage_mg: "5mg",
    total_dispensed_pills: 60,
    current_pill_count: 42,
    pills_per_dose: 1,
    doses_per_day: 2,
    refill_threshold_days: 5,
    auto_refill_triggered: false,
    is_active: true,
    created_at: iso(-20),
  }),
];

const refillOrders: RefillOrder[] = [
  {
    id: 1,
    prescription: 1,
    status: "AUTO_GENERATED",
    days_left_at_trigger: 4,
    requested_at: iso(-1, 6, 15),
    notes: "Supply fell below the 5-day threshold — sent to Cimas automatically.",
  },
];

const doseLogs: DoseComplianceLog[] = Array.from({ length: 21 }, (_, i) => {
  const day = -Math.floor(i / 3);
  const slot = [8, 13, 18][i % 3]!;
  const taken = ![1, 5, 11].includes(i);
  return {
    id: i + 1,
    prescription: 1,
    scheduled_time: iso(day, slot),
    actual_time: taken ? iso(day, slot, 12) : null,
    was_taken: taken,
    notes: null,
  };
});

// Patient directory — maps backend patient ids to the clinician roster ids.
const patientDirectory = [
  { patient_id: 1, roster_id: "p1", name: "Tendai Moyo", doses_per_day: 3, medication_name: "Levodopa / Carbidopa (Sinemet)", dose_label: "25mg / 100mg" },
  { patient_id: 2, roster_id: "p2", name: "Grace Ncube", doses_per_day: 2, medication_name: "Levodopa / Carbidopa (Sinemet)", dose_label: "25mg / 100mg" },
  { patient_id: 3, roster_id: "p3", name: "Farai Dube", doses_per_day: 3, medication_name: "Levodopa / Carbidopa (Sinemet)", dose_label: "25mg / 250mg" },
  { patient_id: 5, roster_id: "p5", name: "Kudakwashe Banda", doses_per_day: 2, medication_name: "Selegiline", dose_label: "5mg" },
];

const symptomDiaries: SymptomDiary[] = [
  {
    id: 501,
    patient_id: 1,
    timestamp: iso(0, 6, 40),
    tremor_severity: 4,
    muscle_stiffness: 4,
    slowness_of_movement: 4,
    had_accidental_fall: true,
    wearing_off_episode: true,
    patient_notes: "Fell in the bathroom before the morning dose.",
  },
  {
    id: 502,
    patient_id: 3,
    timestamp: iso(-1, 19, 5),
    tremor_severity: 3,
    muscle_stiffness: 3,
    slowness_of_movement: 4,
    had_accidental_fall: true,
    wearing_off_episode: true,
    patient_notes: "Lost balance standing up from a chair.",
  },
  {
    id: 503,
    patient_id: 2,
    timestamp: iso(-2, 11, 20),
    tremor_severity: 2,
    muscle_stiffness: 3,
    slowness_of_movement: 3,
    had_accidental_fall: true,
    wearing_off_episode: false,
    patient_notes: null,
  },
  {
    id: 504,
    patient_id: 5,
    timestamp: iso(-3, 9, 0),
    tremor_severity: 2,
    muscle_stiffness: 2,
    slowness_of_movement: 2,
    had_accidental_fall: false,
    wearing_off_episode: false,
    patient_notes: "Good day, no problems.",
  },
];

let nextId = 1000;
const delay = <T,>(value: T) => new Promise<T>((r) => setTimeout(() => r(value), 120));

// GET /api/prescriptions/?patient_id=&is_active=true
export function listPrescriptions(patientId = DEMO_PATIENT_ID) {
  return delay(prescriptions.filter((p) => p.patient_id === patientId && p.is_active));
}

// GET /api/refill-orders/?prescription=
export function listRefillOrders(prescriptionId?: number) {
  return delay(
    prescriptionId == null
      ? [...refillOrders]
      : refillOrders.filter((r) => r.prescription === prescriptionId),
  );
}

// POST /api/refill-orders/
export function createRefillOrder(payload: RefillOrderCreate) {
  const prescription = prescriptions.find((p) => p.id === payload.prescription);
  const order: RefillOrder = {
    id: nextId++,
    prescription: payload.prescription,
    status: payload.status ?? "AUTO_GENERATED",
    days_left_at_trigger: prescription?.days_supply_remaining ?? 0,
    requested_at: new Date().toISOString(),
    notes: payload.notes ?? null,
  };
  refillOrders.unshift(order);
  if (prescription) prescription.auto_refill_triggered = true;
  return delay(order);
}

// GET /api/dose-logs/?prescription=
export function listDoseLogs(prescriptionId?: number) {
  return delay(
    prescriptionId == null
      ? [...doseLogs]
      : doseLogs.filter((l) => l.prescription === prescriptionId),
  );
}

// POST /api/dose-logs/
export function createDoseLog(payload: DoseComplianceLogCreate) {
  const log: DoseComplianceLog = {
    id: nextId++,
    prescription: payload.prescription,
    scheduled_time: new Date().toISOString(),
    actual_time: payload.actual_time ?? (payload.was_taken ? new Date().toISOString() : null),
    was_taken: payload.was_taken,
    notes: payload.notes ?? null,
  };
  doseLogs.unshift(log);
  const prescription = prescriptions.find((p) => p.id === payload.prescription);
  if (prescription && payload.was_taken) {
    prescription.current_pill_count = Math.max(
      0,
      prescription.current_pill_count - prescription.pills_per_dose,
    );
    prescription.days_supply_remaining = daysSupplyRemaining(prescription);
  }
  return delay(log);
}

// GET /api/symptom-diaries/?patient_id=
export function listSymptomDiaries(patientId = DEMO_PATIENT_ID) {
  return delay(symptomDiaries.filter((s) => s.patient_id === patientId));
}

// POST /api/symptom-diaries/
export function createSymptomDiary(payload: SymptomDiaryCreate) {
  const entry: SymptomDiary = {
    id: nextId++,
    timestamp: new Date().toISOString(),
    ...payload,
  };
  symptomDiaries.unshift(entry);
  return delay(entry);
}

/** Adherence over the last N days, computed from dose logs like the backend will. */
export function adherenceFromLogs(logs: DoseComplianceLog[], days = 7) {
  const cutoff = Date.now() - days * 86400_000;
  const window = logs.filter((l) => new Date(l.scheduled_time).getTime() >= cutoff);
  if (window.length === 0) return 0;
  return window.filter((l) => l.was_taken).length / window.length;
}

// GET /api/symptom-diaries/?had_accidental_fall=true  (Tier-1 escalations only)
export function listTier1FallEvents() {
  const rows: FallEvent[] = symptomDiaries
    .filter((s) => s.had_accidental_fall)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .map((s) => {
      const patient = patientDirectory.find((p) => p.patient_id === s.patient_id);
      const dosesPerDay = patient?.doses_per_day ?? 3;
      return {
        diary_id: s.id,
        patient_id: s.patient_id,
        roster_id: patient?.roster_id ?? `p${s.patient_id}`,
        patient_name: patient?.name ?? `Patient #${s.patient_id}`,
        timestamp: s.timestamp,
        next_dose_due: nextDoseDue({ doses_per_day: dosesPerDay }).toISOString(),
        medication_name: patient?.medication_name ?? "—",
        dose_label: patient?.dose_label ?? "—",
        patient_notes: s.patient_notes,
      };
    });
  return delay(rows);
}

// ---- Symptom diary (clinician view) + clinician notes ----

const clinicianNotes: ClinicianNote[] = [
  {
    id: 901,
    diary: 501,
    patient_id: 1,
    clinician_name: "Dr. T. Chikafu",
    note: "Saw the fall log. Please take the morning dose before getting out of bed and use the walking frame in the bathroom. Reviewing at your next visit.",
    visible_to_patient: true,
    created_at: iso(0, 9, 30),
  },
  {
    id: 902,
    diary: 502,
    patient_id: 3,
    clinician_name: "Sr. M. Nyoni",
    note: "Called the family. Advised sitting for a minute before standing. Monitoring wearing-off pattern.",
    visible_to_patient: true,
    created_at: iso(-1, 20, 10),
  },
];

/** Patient display name for a backend patient_id. */
export function patientName(patientId: number) {
  return (
    patientDirectory.find((p) => p.patient_id === patientId)?.name ?? `Patient #${patientId}`
  );
}

// GET /api/symptom-diaries/  (all patients — clinician console)
export function listAllSymptomDiaries() {
  return delay(
    [...symptomDiaries].sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
  );
}

// GET /api/clinician-notes/?patient_id=&diary=
export function listClinicianNotes(opts: { patientId?: number; diaryId?: number } = {}) {
  return delay(
    clinicianNotes
      .filter((n) => (opts.patientId == null ? true : n.patient_id === opts.patientId))
      .filter((n) => (opts.diaryId == null ? true : n.diary === opts.diaryId))
      .sort((a, b) => b.created_at.localeCompare(a.created_at)),
  );
}

// POST /api/clinician-notes/
export function createClinicianNote(payload: ClinicianNoteCreate) {
  const note: ClinicianNote = {
    id: nextId++,
    diary: payload.diary,
    patient_id: payload.patient_id,
    clinician_name: payload.clinician_name ?? "Care team",
    note: payload.note,
    visible_to_patient: payload.visible_to_patient ?? true,
    created_at: new Date().toISOString(),
  };
  clinicianNotes.unshift(note);
  return delay(note);
}

// PATCH /api/dose-schedule/  — persists the patient's morning/afternoon/evening/night
// pill times. Mocked locally until the Django endpoint is wired up.
export function saveDoseSchedule(schedule: DoseSchedule, patientId = DEMO_PATIENT_ID) {
  doseScheduleStore = { ...schedule };
  return delay({ patient_id: patientId, ...doseScheduleStore });
}

// GET /api/dose-schedule/
export function getRemoteDoseSchedule(patientId = DEMO_PATIENT_ID) {
  return delay({ patient_id: patientId, ...doseScheduleStore });
}
