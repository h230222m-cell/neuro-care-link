import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { patientAppointments, careTeam, patientMessages, fmtRelative, type Message } from "@/lib/mockData";
import { Video, MapPin, Phone, Send } from "lucide-react";

export const Route = createFileRoute("/app/care")({
  head: () => ({
    meta: [
      { title: "Care team — NeuroTrack" },
      { name: "description", content: "Your Cimas care team, appointments and messages." },
      { property: "og:title", content: "Care team — NeuroTrack" },
      { property: "og:description", content: "Appointments and messages with your Cimas team." },
    ],
  }),
  component: Care,
});

function Care() {
  const [tab, setTab] = useState<"appts" | "team" | "chat">("appts");
  const upcoming = patientAppointments.filter((a) => a.status === "scheduled");
  const past = patientAppointments.filter((a) => a.status !== "scheduled");

  return (
    <div className="px-5 pb-6 pt-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Care team</h1>
      <p className="mt-1 text-sm text-muted-foreground">Appointments, contacts and messages.</p>

      <div className="mt-5 grid grid-cols-3 gap-1 rounded-full bg-muted p-1">
        {([
          ["appts", "Appointments"],
          ["team", "Team"],
          ["chat", "Messages"],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              tab === k ? "bg-card text-foreground shadow-[var(--shadow-soft)]" : "text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "appts" && (
        <div className="mt-5 space-y-4">
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Upcoming</h2>
            <ul className="mt-2 space-y-3">
              {upcoming.map((a) => (
                <li key={a.id} className="surface-card p-4">
                  <div className="flex items-start gap-3">
                    <div className={`grid h-11 w-11 flex-none place-items-center rounded-xl ${
                      a.mode === "tele" ? "bg-accent text-accent-foreground" : "bg-primary-soft text-primary"
                    }`}>
                      {a.mode === "tele" ? <Video className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-sm font-semibold text-foreground">{a.title}</h3>
                      <p className="text-xs text-muted-foreground">{a.clinician} · {a.location}</p>
                      <p className="mt-0.5 text-xs font-medium text-primary">{fmtRelative(a.when)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button className="flex-1 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
                      {a.mode === "tele" ? "Join call" : "Directions"}
                    </button>
                    <button className="rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-foreground">
                      Reschedule
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
          {past.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Past</h2>
              <ul className="mt-2 space-y-2">
                {past.map((a) => (
                  <li key={a.id} className="rounded-xl border border-border bg-card px-4 py-3">
                    <p className="text-sm font-medium text-foreground">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.clinician} · {fmtRelative(a.when)}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {tab === "team" && (
        <ul className="mt-5 space-y-3">
          {careTeam.map((c) => (
            <li key={c.id} className="surface-card flex items-center gap-4 p-4">
              <div className="grid h-12 w-12 flex-none place-items-center rounded-full bg-primary-soft font-semibold text-primary">
                {c.avatarInitials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-semibold text-foreground">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.role} · {c.facility}</p>
              </div>
              <a
                href={`tel:${c.phone.replace(/\s/g, "")}`}
                className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground"
              >
                <Phone className="h-4 w-4" />
              </a>
            </li>
          ))}
        </ul>
      )}

      {tab === "chat" && <ChatPane />}
    </div>
  );
}

function ChatPane() {
  const [msgs, setMsgs] = useState<Message[]>(patientMessages);
  const [draft, setDraft] = useState("");
  const send = () => {
    if (!draft.trim()) return;
    setMsgs((m) => [
      ...m,
      { id: crypto.randomUUID(), from: "me", author: "Me", at: new Date().toISOString(), body: draft.trim() },
    ]);
    setDraft("");
  };
  return (
    <div className="mt-5">
      <ul className="space-y-3">
        {msgs.map((m) => (
          <li key={m.id} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                m.from === "me"
                  ? "bg-primary text-primary-foreground"
                  : "surface-card"
              }`}
            >
              {m.from === "care" && (
                <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">{m.author}</p>
              )}
              <p className={m.from === "me" ? "" : "text-foreground"}>{m.body}</p>
              <p className={`mt-1 text-[10px] ${m.from === "me" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                {fmtRelative(m.at)}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <div className="sticky bottom-24 mt-4 flex items-center gap-2 rounded-full border border-border bg-card p-1.5 shadow-[var(--shadow-soft)]">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Message your care team…"
          className="flex-1 bg-transparent px-3 py-2 text-sm outline-none"
        />
        <button onClick={send} className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground">
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
