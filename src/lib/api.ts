const DJANGO_BASE_URL = 'http://127.0.0.1:8000';

export interface Prescription {
  id: number;
  patient_id: number;
  medication_name: string;
  dosage_mg: string;
  total_dispensed_pills: number;
  current_pill_count: number;
  doses_per_day?: number;
  is_active: boolean;
}

export async function listPrescriptions(patientId: number = 1): Promise<Prescription[]> {
  try {
    const res = await fetch(`${DJANGO_BASE_URL}/api/prescriptions/?patient_id=${patientId}`);
    if (!res.ok) throw new Error('Failed to fetch prescriptions');
    return await res.json();
  } catch (error) {
    console.error('API Error (listPrescriptions):', error);
    return [];
  }
}

export async function listDoseLogs(patientId: number = 1) {
  try {
    const res = await fetch(`${DJANGO_BASE_URL}/api/dose-logs/?patient_id=${patientId}`);
    if (!res.ok) throw new Error('Failed to fetch dose logs');
    return await res.json();
  } catch (error) {
    console.error('API Error (listDoseLogs):', error);
    return [];
  }
}

export const api = {
  getPrescriptions: async (patientId: number = 1): Promise<Prescription[]> => {
    return listPrescriptions(patientId);
  },

  logDose: async (prescriptionId: number, confirmed: boolean = true) => {
    const res = await fetch(`${DJANGO_BASE_URL}/api/dose-logs/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prescription: prescriptionId, confirmed }),
    });
    if (!res.ok) throw new Error('Failed to log dose');
    return await res.json();
  },

  uploadVoiceSample: async (file: File, patientId: number = 1) => {
    const formData = new FormData();
    formData.append('audio', file);
    formData.append('patient_id', String(patientId));

    const res = await fetch(`${DJANGO_BASE_URL}/api/voice-samples/`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to upload voice sample');
    return await res.json();
  },

  getCimasAdminDashboard: async () => {
    const res = await fetch(`${DJANGO_BASE_URL}/api/cimas/dashboard/`);
    if (!res.ok) throw new Error('Failed to fetch clinician dashboard data');
    return await res.json();
  },

  approveRefill: async (refillId: number) => {
    const res = await fetch(`${DJANGO_BASE_URL}/api/refills/${refillId}/approve/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to approve refill');
    return await res.json();
  },
};