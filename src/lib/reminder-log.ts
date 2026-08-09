// Reminder delivery ledger.
//
// Every dose reminder the app fires is recorded here so the patient gets an
// in-app confirmation ("Reminder delivered 08:00 ✓") instead of having to trust
// that a notification went out. Records persist in localStorage, are retried
// when a delivery fails, and are acked to the backend when the network allows.

export type DeliveryChannel = "system" | "in-app";
export type DeliveryStatus = "pending" | "delivered" | "failed" | "acknowledged";

export interface ReminderDelivery {
  id: string;
  /** Stable dose key: `${prescriptionId}-${scheduledISO}`. */
  key: string;
  prescription_id: number;
  medication_name: string;
  /** Wall-clock instant the dose was scheduled for. */
  scheduled_at: string;
  delivered_at: string | null;
  channel: DeliveryChannel;
  status: DeliveryStatus;
  attempts: number;
  error: string | null;
  /** True once the backend has confirmed the delivery record. */
  synced: boolean;
  timezone: string;
}

const STORAGE_KEY = "neurotrack.reminderDeliveries";
const MAX_RECORDS = 60;

let records: ReminderDelivery[] = [];
let hydrated = false;
const listeners = new Set<() => void>();

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, MAX_RECORDS)));
  } catch {
    /* storage full or unavailable */
  }
  listeners.forEach((l) => l());
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) records = JSON.parse(raw) as ReminderDelivery[];
  } catch {
    records = [];
  }
}

const EMPTY: ReminderDelivery[] = [];

export function listDeliveries(): ReminderDelivery[] {
  hydrate();
  return records;
}

export function serverDeliveriesSnapshot(): ReminderDelivery[] {
  return EMPTY;
}

export function subscribeDeliveries(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function findDelivery(key: string) {
  return listDeliveries().find((r) => r.key === key);
}

/** Opens (or reuses) a delivery record for a dose about to be reminded. */
export function openDelivery(input: {
  key: string;
  prescription_id: number;
  medication_name: string;
  scheduled_at: string;
  channel: DeliveryChannel;
  timezone: string;
}): ReminderDelivery {
  hydrate();
  const existing = records.find((r) => r.key === input.key && r.channel === input.channel);
  if (existing) return existing;
  const record: ReminderDelivery = {
    id: `${input.key}-${input.channel}`,
    delivered_at: null,
    status: "pending",
    attempts: 0,
    error: null,
    synced: false,
    ...input,
  };
  records = [record, ...records].slice(0, MAX_RECORDS);
  persist();
  return record;
}

function patch(id: string, patchFields: Partial<ReminderDelivery>) {
  hydrate();
  records = records.map((r) => (r.id === id ? { ...r, ...patchFields } : r));
  persist();
  return records.find((r) => r.id === id);
}

export function markDelivered(id: string, attempts: number) {
  return patch(id, {
    status: "delivered",
    delivered_at: new Date().toISOString(),
    attempts,
    error: null,
  });
}

export function markFailed(id: string, attempts: number, error: string) {
  return patch(id, { status: "failed", attempts, error });
}

export function markSynced(id: string) {
  return patch(id, { synced: true });
}

/** Patient tapped "Got it" on the confirmation. */
export function acknowledgeDelivery(id: string) {
  return patch(id, { status: "acknowledged" });
}

export function clearDeliveries() {
  hydrate();
  records = [];
  persist();
}
