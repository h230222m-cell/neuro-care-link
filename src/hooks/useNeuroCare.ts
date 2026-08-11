// src/hooks/useNeuroCare.ts
import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

export function useNeuroCare() {
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api.getPatientData();
      setPatient(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error connecting to PyCharm API');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logDose = async (slot: 'morning' | 'afternoon' | 'evening') => {
    await api.logDose(slot);
    await refresh();
  };

  const submitVoiceCheckin = async (score: number) => {
    await api.submitVoiceCheckin(score);
    await refresh();
  };

  const triggerFallAlert = async () => {
    await api.triggerFallAlert();
    await refresh();
  };

  return {
    patient,
    loading,
    error,
    logDose,
    submitVoiceCheckin,
    triggerFallAlert,
    refresh,
  };
}