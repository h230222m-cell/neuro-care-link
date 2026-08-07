import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Clock, Pill } from "lucide-react";
import { listPrescriptions } from "@/lib/api/client";
import { countdown, fmtClock, upcomingDoses } from "@/lib/dose-timers";
import { doseTimes } from "@/lib/api/types";

/** Live client-side countdown to the patient's next scheduled dose. */
export function NextDoseTimer() {
  const [now, setNow] = useState(() => new Date());
  const { data } = useQuery({ queryKey: ["prescriptions"], queryFn: () => listPrescriptions() });

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const rows = data ?? [];
  const next = upcomingDoses(rows, now)[0];
  if (!next) return null;

  const c = countdown(next.at, now);
  const slots = doseTimes(next.prescription);

  return (
    <Link to="/app/meds" className="surface-card block overflow-hidden p-5 transition hover:shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Next dose in</p>
          <p className="mt-1 font-display text-4xl font-semibold tabular-nums tracking-tight text-primary">
            {c.h > 0 ? `${c.h}:${String(c.m).padStart(2, "0")}` : `${c.m}:${String(c.s).padStart(2, "0")}`}
            <span className="ml-1.5 align-middle text-xs font-medium tracking-normal text-muted-foreground">
              {c.h > 0 ? "hrs" : "min"}
            </span>
          </p>
          <p className="mt-2 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
            <Pill className="h-3.5 w-3.5 flex-none" />
            {next.prescription.medication_name} · {next.prescription.pills_per_dose} pill
            {next.prescription.pills_per_dose > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex-none rounded-2xl bg-primary-soft px-3 py-2 text-center">
          <p className="flex items-center gap-1 font-display text-sm font-semibold tabular-nums text-primary">
            <Clock className="h-3.5 w-3.5" /> {fmtClock(next.at)}
          </p>
          <p className="mt-0.5 text-[10px] text-primary/70">scheduled</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-1.5">
        {slots.map((s) => {
          const past = s < fmtClock(now);
          return (
            <span
              key={s}
              className={`flex-1 rounded-full py-1 text-center text-[10px] font-medium tabular-nums ${
                s === next.slot
                  ? "bg-primary text-primary-foreground"
                  : past
                    ? "bg-muted text-muted-foreground"
                    : "bg-primary-soft text-primary"
              }`}
            >
              {s}
            </span>
          );
        })}
      </div>
    </Link>
  );
}
