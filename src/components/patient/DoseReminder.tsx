import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, Check, Clock, X } from "lucide-react";
import { createDoseLog, listDoseLogs, listPrescriptions } from "@/lib/api/client";
import { doseTimes, nextDoseDue, type Prescription } from "@/lib/api/types";

type DueDose = {
  key: string;
  prescription: Prescription;
  scheduledAt: Date;
  /** true when the dose window is open right now */
  open: boolean;
};

const WINDOW_MS = 90 * 60 * 1000;

function slotDate(slot: string, base: Date) {
  const [h, m] = slot.split(":").map(Number);
  const d = new Date(base);
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d;
}

const fmtTime = (d: Date) =>
  d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });

/**
 * In-app pill reminder. Shows a banner while a dose window is open and — once
 * the patient allows it — fires a browser notification at each dose time.
 */
export function DoseReminder() {
  const qc = useQueryClient();
  const [now, setNow] = useState(() => new Date());
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const notified = useRef<Set<string>>(new Set());

  const prescriptions = useQuery({ queryKey: ["prescriptions"], queryFn: () => listPrescriptions() });
  const doseLogs = useQuery({ queryKey: ["dose-logs"], queryFn: () => listDoseLogs() });

  useEffect(() => {
    setPermission(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const logs = doseLogs.data ?? [];

  const due = useMemo<DueDose[]>(() => {
    const rows: DueDose[] = [];
    for (const p of prescriptions.data ?? []) {
      for (const slot of doseTimes(p)) {
        const at = slotDate(slot, now);
        const elapsed = now.getTime() - at.getTime();
        if (elapsed < 0 || elapsed > WINDOW_MS) continue;
        const logged = logs.some(
          (l) =>
            l.prescription === p.id &&
            l.was_taken &&
            Math.abs(new Date(l.scheduled_time).getTime() - at.getTime()) < WINDOW_MS,
        );
        if (logged) continue;
        rows.push({ key: `${p.id}-${at.toISOString()}`, prescription: p, scheduledAt: at, open: true });
      }
    }
    return rows;
  }, [prescriptions.data, logs, now]);

  const nextUp = useMemo(() => {
    const list = (prescriptions.data ?? []).map((p) => ({ p, at: nextDoseDue(p, now) }));
    return list.sort((a, b) => a.at.getTime() - b.at.getTime())[0];
  }, [prescriptions.data, now]);

  // Fire a browser notification once per open dose window.
  useEffect(() => {
    if (permission !== "granted") return;
    for (const d of due) {
      if (notified.current.has(d.key)) continue;
      notified.current.add(d.key);
      try {
        new Notification("Time for your medication", {
          body: `${d.prescription.medication_name} · ${d.prescription.pills_per_dose} pill(s) · due ${fmtTime(d.scheduledAt)}`,
          tag: d.key,
          icon: "/icon-512.png",
        });
      } catch {
        /* notification blocked by the browser */
      }
    }
  }, [due, permission]);

  const logDose = useMutation({
    mutationFn: (prescription: number) => createDoseLog({ prescription, was_taken: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dose-logs"] });
      qc.invalidateQueries({ queryKey: ["prescriptions"] });
    },
  });

  const visible = due.filter((d) => !dismissed.includes(d.key));

  if (visible.length === 0) {
    if (permission !== "default" || !nextUp) return null;
    return (
      <div className="mx-5 mt-4 flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
        <BellRing className="h-4 w-4 flex-none text-primary" />
        <p className="min-w-0 flex-1 text-xs text-muted-foreground">
          Get a reminder at {fmtTime(nextUp.at)} when your next dose is due.
        </p>
        <button
          onClick={() => Notification.requestPermission().then(setPermission)}
          className="rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground"
        >
          Turn on
        </button>
      </div>
    );
  }

  return (
    <div className="mx-5 mt-4 space-y-3">
      {visible.map((d) => (
        <div key={d.key} className="rounded-2xl border border-primary/30 bg-primary-soft p-4">
          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-primary text-primary-foreground">
              <BellRing className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-semibold text-primary">Time to take your pills</p>
              <p className="mt-0.5 text-xs text-primary/80">
                {d.prescription.medication_name} · {d.prescription.pills_per_dose} pill
                {d.prescription.pills_per_dose > 1 ? "s" : ""}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-[11px] text-primary/70">
                <Clock className="h-3 w-3" /> Due at {fmtTime(d.scheduledAt)}
              </p>
            </div>
            <button
              onClick={() => setDismissed((x) => [...x, d.key])}
              title="Dismiss"
              className="grid h-7 w-7 flex-none place-items-center rounded-lg text-primary/60 hover:bg-primary/10"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => logDose.mutate(d.prescription.id)}
              disabled={logDose.isPending}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" /> I've taken it
            </button>
            {permission === "default" && (
              <button
                onClick={() => Notification.requestPermission().then(setPermission)}
                className="rounded-full border border-primary/30 bg-card px-4 py-2 text-xs font-medium text-primary"
              >
                Remind me
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
