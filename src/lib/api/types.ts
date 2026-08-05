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
