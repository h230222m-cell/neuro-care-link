import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Sparkline } from "@/components/Sparkline";
import { roster, tierLabel, fmtRelative, type PatientSummary } from "@/lib/mockData";
import { Search, Filter } from "lucide-react";

export const Route = createFileRoute("/clinician/")({
  head: () => ({
    meta: [
      { title: "Roster — NeuroTrack Clinician" },
      { name: "description", content: "Patient roster with tier flags, adherence and voice trends for the Cimas team." },
      { property: "og:title", content: "Roster — NeuroTrack Clinician" },
      { property: "og:description", content: "Prioritized care queue." },
    ],
  }),
  component: Roster,
});

type TierFilter = "all" | "tier1" | "tier2" | "stable";

function Roster() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<TierFilter>("all");

  const filtered = useMemo(() => {
    return roster
      .filter((p) => (filter === "all" ? true : p.tier === filter))
      .filter((p) => p.name.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => tierRank(a.tier) - tierRank(b.tier));
  }, [q, filter]);

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Care roster</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {roster.length} patients under NeuroTrack monitoring · {roster.filter((r) => r.tier !== "stable").length} need review
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search patients…"
            className="w-full rounded-full border border-input bg-card py-2.5 pl-10 pr-4 text-sm outline-none ring-ring focus:border-ring focus:ring-2"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {([
            ["all", "All"],
            ["tier1", "Tier 1"],
            ["tier2", "Tier 2"],
            ["stable", "Stable"],
          ] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-medium transition ${
                filter === k
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
          <button className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-muted-foreground">
            <Filter className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-3">
        {filtered.map((p) => <PatientRow key={p.id} p={p} />)}
      </div>
    </div>
  );
}

function tierRank(t: PatientSummary["tier"]) {
  return t === "tier1" ? 0 : t === "tier2" ? 1 : 2;
}

function PatientRow({ p }: { p: PatientSummary }) {
  const badge =
    p.tier === "tier1"
      ? "bg-destructive/10 text-destructive"
      : p.tier === "tier2"
        ? "bg-warning/20 text-warning-foreground"
        : "bg-success/15 text-success-foreground";

  return (
    <Link
      to="/clinician/patients/$id"
      params={{ id: p.id }}
      className="surface-card grid grid-cols-1 gap-4 p-5 transition hover:bg-primary-soft/20 md:grid-cols-[minmax(0,1fr)_140px_140px_120px]"
    >
      <div className="flex items-start gap-4">
        <div className="grid h-11 w-11 flex-none place-items-center rounded-full bg-primary-soft font-semibold text-primary">
          {p.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-base font-semibold text-foreground">{p.name}</h2>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badge}`}>
              {tierLabel(p.tier)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {p.age}y {p.gender} · {p.location}
          </p>
          {p.flag && <p className="mt-1 text-xs text-foreground">{p.flag}</p>}
        </div>
      </div>

      <div>
        <p className="text-[10px] uppercase text-muted-foreground">Adherence 7d</p>
        <p className="font-display text-base font-semibold">{Math.round(p.adherence7d * 100)}%</p>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full ${p.adherence7d < 0.6 ? "bg-warning" : "bg-primary"}`}
            style={{ width: `${p.adherence7d * 100}%` }}
          />
        </div>
      </div>

      <div>
        <p className="text-[10px] uppercase text-muted-foreground">Voice 14d</p>
        <Sparkline values={p.voiceTrend} className="mt-1 h-8 w-full" />
      </div>

      <div>
        <p className="text-[10px] uppercase text-muted-foreground">Last check-in</p>
        <p className="font-display text-sm font-semibold">{fmtRelative(p.lastCheckIn)}</p>
      </div>
    </Link>
  );
}
