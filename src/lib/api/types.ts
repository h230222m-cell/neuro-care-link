// DTO types mirroring the Django backend (Neurotrack/models.py) 1:1.
// Field names are kept in snake_case exactly as Django REST Framework will
// serialize them, so wiring to the real API is a drop-in swap of the
// functions in ./client.ts — no shape translation needed.

export type RefillStatus =
  | "AUTO_GENERATED"
  | "APPROVED"
  | "DISPATCHED"
  | "COMPLETED"
  | "CANCELLED";

export const REFILL_STATUS_LABEL: Record<RefillStatus, string> = {
  AUTO_GENERATED: "Auto generated",
  APPROVED: "Approved by Cimas",
  DISPATCHED: "Dispatched",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

/** neurotrack_prescription */
export interface Prescription {
  id: number;
  patient_id: number;
  medication_name: string;
  dosage_mg: string;
  total_dispensed_pills: number;
  current_pill_count: number;
  pills_per_dose: number;
  doses_per_day: number;
  refill_threshold_days: number;
  auto_refill_triggered: boolean;
  is_active: boolean;
  created_at: string; // ISO datetime
  /** Model property: pills_per_dose * doses_per_day */
  daily_dose_rate: number;
  /** Model property: current_pill_count / daily_dose_rate (1dp) */
  days_supply_remaining: number;
}

/** neurotrack_refillorder */
export interface RefillOrder {
  id: number;
  prescription: number; // FK -> Prescription.id
  status: RefillStatus;
  days_left_at_trigger: number;
  requested_at: string; // ISO datetime
  notes: string | null;
}

/** neurotrack_dosecompliancelog */
export interface DoseComplianceLog {
  id: number;
  prescription: number; // FK -> Prescription.id
  scheduled_time: string; // ISO datetime
  actual_time: string | null;
  was_taken: boolean;
  notes: string | null;
}

/** neurotrack_symptomdiary */
export interface SymptomDiary {
  id: number;
  patient_id: number;
  timestamp: string; // ISO datetime
  tremor_severity: number; // 1..5
  muscle_stiffness: number; // 1..5
  slowness_of_movement: number; // 1..5
  had_accidental_fall: boolean; // Tier-1 escalation flag
  wearing_off_episode: boolean;
  patient_notes: string | null;
}

// ---- Write payloads (what the frontend POSTs) ----

export type DoseComplianceLogCreate = Pick<DoseComplianceLog, "prescription" | "was_taken"> &
  Partial<Pick<DoseComplianceLog, "actual_time" | "notes">>;

export type SymptomDiaryCreate = Omit<SymptomDiary, "id" | "timestamp">;

export type RefillOrderCreate = Pick<RefillOrder, "prescription"> &
  Partial<Pick<RefillOrder, "status" | "notes">>;

// ---- Derived helpers (mirror the Django @property maths) ----

export function dailyDoseRate(p: Pick<Prescription, "pills_per_dose" | "doses_per_day">) {
  return p.pills_per_dose * p.doses_per_day;
}

export function daysSupplyRemaining(
  p: Pick<Prescription, "pills_per_dose" | "doses_per_day" | "current_pill_count">,
) {
  const rate = dailyDoseRate(p);
  if (rate === 0) return 0;
  return Math.round((p.current_pill_count / rate) * 10) / 10;
}

export function needsRefill(p: Prescription) {
  return p.days_supply_remaining <= p.refill_threshold_days;
}

// ---- Dose scheduling (derived from doses_per_day, mirrors the backend rate) ----

/** Fallback slots; the live times come from the patient's dose schedule. */
export const DOSE_SLOTS = ["08:00", "13:00", "18:00", "22:00"] as const;

export function doseTimes(p: Pick<Prescription, "doses_per_day">): string[] {
  const slots = getDoseSlots();
  return slots.slice(0, Math.max(1, Math.min(p.doses_per_day, slots.length)));
}


/** Next scheduled dose datetime for a prescription, relative to `from`. */
export function nextDoseDue(p: Pick<Prescription, "doses_per_day">, from = new Date()): Date {
  for (const slot of doseTimes(p)) {
    const [h, m] = slot.split(":").map(Number);
    const at = new Date(from);
    at.setHours(h ?? 0, m ?? 0, 0, 0);
    if (at.getTime() > from.getTime()) return at;
  }
  const [h, m] = (doseTimes(p)[0] ?? "08:00").split(":").map(Number);
  const tomorrow = new Date(from);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(h ?? 8, m ?? 0, 0, 0);
  return tomorrow;
}

/** A Tier-1 escalation row: a fall in SymptomDiary + the patient's dose context. */
export interface FallEvent {
  diary_id: number;
  patient_id: number;
  /** Roster id used by the clinician console routes. */
  roster_id: string;
  patient_name: string;
  /** When the fall was recorded (SymptomDiary.timestamp). */
  timestamp: string;
  /** ISO datetime of the next dose the patient is due to take. */
  next_dose_due: string;
  medication_name: string;
  dose_label: string;
  patient_notes: string | null;
}

// ---- Clinician notes attached to a symptom diary entry ----

/** neurotrack_cliniciannote — a clinician reply on a patient's diary entry. */
export interface ClinicianNote {
  id: number;
  diary: number; // FK -> SymptomDiary.id
  patient_id: number;
  clinician_name: string;
  note: string;
  /** When true the patient sees this note in their diary (transparency). */
  visible_to_patient: boolean;
  created_at: string; // ISO datetime
}

export type ClinicianNoteCreate = Pick<ClinicianNote, "diary" | "patient_id" | "note"> &
  Partial<Pick<ClinicianNote, "clinician_name" | "visible_to_patient">>;

export const SYMPTOM_SCALE_LABEL: Record<number, string> = {
  1: "None",
  2: "Mild",
  3: "Moderate",
  4: "Severe",
  5: "Very severe",
};
