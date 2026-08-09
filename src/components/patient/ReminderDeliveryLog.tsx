import { useSyncExternalStore } from "react";
import { CheckCheck, Clock3, RefreshCw, Trash2 } from "lucide-react";
import {
  clearDeliveries,
  listDeliveries,
  serverDeliveriesSnapshot,
  subscribeDeliveries,
} from "@/lib/reminder-log";
import { fmtZonedClock, tzOffsetLabel } from "@/lib/tz";

/** In-app confirmation ledger: proof each reminder was actually delivered. */
export function ReminderDeliveryLog({ timezone }: { timezone: string }) {
  const deliveries = useSyncExternalStore(
    subscribeDeliveries,
    listDeliveries,
    serverDeliveriesSnapshot,
  );

  const recent = deliveries.slice(0, 8);

  return (
    <div className="surface-card mt-2 p-4">
      <div className="flex items-center gap-3">
        <div className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-primary-soft text-primary">
          <CheckCheck className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">Reminder receipts</p>
          <p className="text-xs text-muted-foreground">
            Times shown in {timezone.replace("_", " ")} ({tzOffsetLabel(timezone)})
          </p>
        </div>
        {recent.length > 0 && (
          <button
            onClick={clearDeliveries}
            className="flex-none rounded-lg p-1.5 text-muted-foreground hover:text-foreground"
            title="Clear receipts"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {recent.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          No reminders delivered yet. Once a dose time arrives, each alert is confirmed here.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {recent.map((r) => (
            <li key={r.id} className="flex items-center gap-3 py-2.5">
              <span
                className={`grid h-7 w-7 flex-none place-items-center rounded-lg ${
                  r.status === "failed"
                    ? "bg-warning/15 text-warning-foreground"
                    : r.status === "pending"
                      ? "bg-muted text-muted-foreground"
                      : "bg-success/15 text-success"
                }`}
              >
                {r.status === "failed" ? (
                  <RefreshCw className="h-3.5 w-3.5" />
                ) : r.status === "pending" ? (
                  <Clock3 className="h-3.5 w-3.5" />
                ) : (
                  <CheckCheck className="h-3.5 w-3.5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground">
                  {r.medication_name}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  Due {fmtZonedClock(new Date(r.scheduled_at), r.timezone || timezone)} ·{" "}
                  {r.status === "failed"
                    ? `failed after ${r.attempts} tries`
                    : r.delivered_at
                      ? `delivered ${fmtZonedClock(new Date(r.delivered_at), r.timezone || timezone)}`
                      : "waiting"}{" "}
                  · {r.channel === "system" ? "notification" : "in-app"}
                </p>
              </div>
              <span
                className={`flex-none text-[10px] font-semibold uppercase tracking-wide ${
                  r.synced ? "text-success" : "text-muted-foreground"
                }`}
              >
                {r.synced ? "Saved" : "Queued"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
