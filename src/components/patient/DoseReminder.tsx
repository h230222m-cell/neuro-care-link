import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, Check, CheckCheck, Clock, RefreshCw, X } from "lucide-react";
import { ackReminderDelivery, createDoseLog, listDoseLogs, listPrescriptions } from "@/lib/api/client";
import { doseTimes, type Prescription } from "@/lib/api/types";
import { countdown, fmtClock, slotDate, upcomingDoses } from "@/lib/dose-timers";
import { useDoseSchedule } from "@/lib/use-dose-schedule";
import {
  acknowledgeDelivery,
  listDeliveries,
  markDelivered,
  markFailed,
  markSynced,
  openDelivery,
  serverDeliveriesSnapshot,
  subscribeDeliveries,
  type ReminderDelivery,
} from "@/lib/reminder-log";
import { tzOffsetLabel } from "@/lib/tz";

type DueDose = {
  key: string;
  prescription: Prescription;
  scheduledAt: Date;
};

const WINDOW_MS = 90 * 60 * 1000;
const NOTIFY_ATTEMPTS = 3;
const NOTIFY_BACKOFF_MS = 4000;

/**
 * In-app pill reminder. Dose times come from the server-stored schedule (with
 * its IANA timezone), a banner opens while a dose window is live, and — once the
 * patient allows notifications — a client-side timer fires a system notification
 * at the exact scheduled instant. Every attempt is written to the delivery
 * ledger, retried on failure, and confirmed back to the patient in-app.
 */
export function DoseReminder() {
  const qc = useQueryClient();
  const [now, setNow] = useState(() => new Date());
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const fired = useRef<Set<string>>(new Set());
  const { schedule } = useDoseSchedule();
  const tz = schedule.timezone;

  const deliveries = useSyncExternalStore(
    subscribeDeliveries,
    listDeliveries,
    serverDeliveriesSnapshot,
  );

  const prescriptions = useQuery({ queryKey: ["prescriptions"], queryFn: () => listPrescriptions() });
  const doseLogs = useQuery({ queryKey: ["dose-logs"], queryFn: () => listDoseLogs() });

  useEffect(() => {
    setPermission(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const logs = doseLogs.data ?? [];
  const rows = prescriptions.data ?? [];

  /** Records the receipt locally, then acks it to the backend with retries. */
  const sync = useCallback((record: ReminderDelivery | undefined) => {
    if (!record) return;
    void ackReminderDelivery({
      id: record.id,
      prescription_id: record.prescription_id,
      scheduled_at: record.scheduled_at,
      delivered_at: record.delivered_at,
      channel: record.channel,
      status: record.status,
      attempts: record.attempts,
      timezone: record.timezone,
    })
      .then(() => markSynced(record.id))
      .catch(() => {
        /* stays unsynced; retried next time the app opens */
      });
  }, []);

  const due = useMemo<DueDose[]>(() => {
    const out: DueDose[] = [];
    for (const p of rows) {
      for (const slot of doseTimes(p)) {
        const at = slotDate(slot, now, tz);
        const elapsed = now.getTime() - at.getTime();
        if (elapsed < 0 || elapsed > WINDOW_MS) continue;
        const logged = logs.some(
          (l) =>
            l.prescription === p.id &&
            l.was_taken &&
            Math.abs(new Date(l.scheduled_time).getTime() - at.getTime()) < WINDOW_MS,
        );
        if (logged) continue;
        out.push({ key: `${p.id}-${at.toISOString()}`, prescription: p, scheduledAt: at });
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, logs, tz, Math.floor(now.getTime() / 60_000)]);

  const nextUp = useMemo(
    () => upcomingDoses(rows, now, tz)[0],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, tz, schedule, Math.floor(now.getTime() / 60_000)],
  );

  /* An open banner is itself a delivery — log it so the patient sees a receipt. */
  useEffect(() => {
    for (const d of due) {
      const record = openDelivery({
        key: `${d.key}-banner`,
        prescription_id: d.prescription.id,
        medication_name: d.prescription.medication_name,
        scheduled_at: d.scheduledAt.toISOString(),
        channel: "in-app",
        timezone: tz,
      });
      if (record.status === "pending") sync(markDelivered(record.id, 1));
    }
  }, [due, tz, sync]);

  /* Client-side timers: one setTimeout per upcoming dose in the next 12 hours. */
  useEffect(() => {
    if (permission !== "granted" || rows.length === 0) return;
    const from = new Date();

    const notify = (
      recordId: string,
      title: string,
      body: string,
      tag: string,
      attempt = 1,
    ): void => {
      try {
        const n = new Notification(title, { body, tag, icon: "/icon-512.png" });
        n.onerror = () => retry(recordId, title, body, tag, attempt);
        sync(markDelivered(recordId, attempt));
      } catch (err) {
        markFailed(recordId, attempt, err instanceof Error ? err.message : "notify failed");
        retry(recordId, title, body, tag, attempt);
      }
    };

    const retryTimers: ReturnType<typeof setTimeout>[] = [];
    const retry = (recordId: string, title: string, body: string, tag: string, attempt: number) => {
      if (attempt >= NOTIFY_ATTEMPTS) {
        sync(markFailed(recordId, attempt, "notification could not be delivered"));
        return;
      }
      retryTimers.push(
        setTimeout(
          () => notify(recordId, title, body, tag, attempt + 1),
          NOTIFY_BACKOFF_MS * attempt,
        ),
      );
    };

    const timers = upcomingDoses(rows, from, tz)
      .filter((d) => d.at.getTime() - from.getTime() < 12 * 3600_000 && !fired.current.has(d.key))
      .map((d) => {
        const ms = d.at.getTime() - Date.now();
        return setTimeout(() => {
          fired.current.add(d.key);
          const record = openDelivery({
            key: d.key,
            prescription_id: d.prescription.id,
            medication_name: d.prescription.medication_name,
            scheduled_at: d.at.toISOString(),
            channel: "system",
            timezone: tz,
          });
          notify(
            record.id,
            "Time for your medication",
            `${d.prescription.medication_name} · ${d.prescription.pills_per_dose} pill(s) · scheduled for ${fmtClock(d.at, tz)}`,
            d.key,
          );
        }, Math.max(0, ms));
      });

    return () => {
      timers.forEach(clearTimeout);
      retryTimers.forEach(clearTimeout);
    };
  }, [permission, rows, schedule, tz, sync]);

  const logDose = useMutation({
    mutationFn: (prescription: number) => createDoseLog({ prescription, was_taken: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dose-logs"] });
      qc.invalidateQueries({ queryKey: ["prescriptions"] });
    },
  });

  const visible = due.filter((d) => !dismissed.includes(d.key));

  /* Receipts the patient hasn't acknowledged yet — shown as confirmations. */
  const receipts = deliveries
    .filter((r) => r.status === "delivered" || r.status === "failed")
    .filter((r) => Date.now() - new Date(r.scheduled_at).getTime() < 12 * 3600_000)
    .filter((r) => !visible.some((v) => r.key.startsWith(v.key)))
    .slice(0, 3);

  const confirmations = receipts.length > 0 && (
    <div className="mx-5 mt-4 space-y-2">
      {receipts.map((r) => (
        <div
          key={r.id}
          className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
            r.status === "failed"
              ? "border-warning/30 bg-warning/10"
              : "border-success/25 bg-success/10"
          }`}
        >
          {r.status === "failed" ? (
            <RefreshCw className="h-4 w-4 flex-none text-warning-foreground" />
          ) : (
            <CheckCheck className="h-4 w-4 flex-none text-success" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-foreground">
              {r.status === "failed"
                ? `Reminder couldn't be delivered (${r.attempts} tries)`
                : `Reminder delivered at ${fmtClock(new Date(r.delivered_at ?? r.scheduled_at), tz)}`}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {r.medication_name} · {r.channel === "system" ? "system notification" : "in-app alert"}
              {r.synced ? " · saved to your record" : " · will sync"}
            </p>
          </div>
          <button
            onClick={() => acknowledgeDelivery(r.id)}
            className="flex-none rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-semibold text-foreground"
          >
            Got it
          </button>
        </div>
      ))}
    </div>
  );

  if (visible.length === 0) {
    if (permission !== "default" || !nextUp) return <>{confirmations}</>;
    return (
      <>
        <div className="mx-5 mt-4 flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-[var(--shadow-soft)]">
          <BellRing className="h-4 w-4 flex-none text-primary" />
          <p className="min-w-0 flex-1 text-xs text-muted-foreground">
            Set a timer for {fmtClock(nextUp.at, tz)} ({tzOffsetLabel(tz)}) — we'll alert you when
            this dose is due.
          </p>
          <button
            onClick={() => Notification.requestPermission().then(setPermission)}
            className="flex-none rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground"
          >
            Turn on
          </button>
        </div>
        {confirmations}
      </>
    );
  }

  return (
    <>
      <div className="mx-5 mt-4 space-y-3">
        {visible.map((d) => (
          <div key={d.key} className="rounded-2xl border border-primary/25 bg-primary-soft p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-primary text-primary-foreground">
                <BellRing className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-semibold text-primary">
                  Time to take your pills
                </p>
                <p className="mt-0.5 text-xs text-primary/80">
                  {d.prescription.medication_name} · {d.prescription.pills_per_dose} pill
                  {d.prescription.pills_per_dose > 1 ? "s" : ""}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-[11px] tabular-nums text-primary/70">
                  <Clock className="h-3 w-3" /> Due at {fmtClock(d.scheduledAt, tz)} ·{" "}
                  {countdown(new Date(d.scheduledAt.getTime() + WINDOW_MS), now).text} left in this
                  window
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
                  className="rounded-full border border-primary/25 bg-card px-4 py-2 text-xs font-medium text-primary"
                >
                  Remind me
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {confirmations}
    </>
  );
}
