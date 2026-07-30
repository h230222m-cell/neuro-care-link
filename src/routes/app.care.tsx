import { createFileRoute } from "@tanstack/react-router";
import { patientAppointments, fmtRelative } from "@/lib/mockData";
import { MapPin, CalendarClock } from "lucide-react";

export const Route = createFileRoute("/app/care")({
  head: () => ({
    meta: [
      { title: "Appointments — NeuroTrack" },
      { name: "description", content: "Your next Cimas appointment and time remaining." },
      { property: "og:title", content: "Appointments — NeuroTrack" },
      { property: "og:description", content: "Know exactly when your next visit is due." },
    ],
  }),
  component: Care,
});

function Care() {
  const upcoming = patientAppointments.filter((a) => a.status === "scheduled");
  const past = patientAppointments.filter((a) => a.status !== "scheduled");
  const next = upcoming[0];

  return (
    <div className="px-5 pb-6 pt-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Appointments</h1>
      <p className="mt-1 text-sm text-muted-foreground">When your next Cimas visit is due.</p>

      {next && <Countdown when={next.when} title={next.title} location={next.location} />}

      <section className="mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Upcoming</h2>
        <ul className="mt-2 space-y-3">
          {upcoming.map((a) => (
            <li key={a.id} className="surface-card p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-primary-soft text-primary">
                  <MapPin className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-sm font-semibold text-foreground">{a.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {a.clinician} · {a.location}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-primary">
                    {new Date(a.when).toLocaleString(undefined, {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · {fmtRelative(a.when)}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {past.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Past</h2>
          <ul className="mt-2 space-y-2">
            {past.map((a) => (
              <li key={a.id} className="rounded-xl border border-border bg-card px-4 py-3">
                <p className="text-sm font-medium text-foreground">{a.title}</p>
                <p className="text-xs text-muted-foreground">
                  {a.clinician} · {fmtRelative(a.when)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Countdown({ when, title, location }: { when: string; title: string; location: string }) {
  const ms = new Date(when).getTime() - Date.now();
  const days = Math.max(0, Math.floor(ms / 86400000));
  const hours = Math.max(0, Math.floor((ms % 86400000) / 3600000));

  return (
    <section className="surface-card mt-5 p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-primary-soft text-primary">
          <CalendarClock className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Next appointment</p>
          <p className="truncate font-display text-base font-semibold text-foreground">{title}</p>
        </div>
      </div>
      <div className="mt-4 flex items-end gap-6">
        <div>
          <p className="font-display text-4xl font-semibold leading-none text-primary">{days}</p>
          <p className="mt-1 text-xs text-muted-foreground">days</p>
        </div>
        <div>
          <p className="font-display text-4xl font-semibold leading-none text-primary">{hours}</p>
          <p className="mt-1 text-xs text-muted-foreground">hours</p>
        </div>
        <p className="ml-auto text-right text-xs text-muted-foreground">{location}</p>
      </div>
    </section>
  );
}
