import React, { useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Mic, Pill, ChevronRight, CalendarClock, Check } from "lucide-react";

import { Logo } from "@/components/Logo";
import { Sparkline } from "@/components/Sparkline";
import { NextDoseTimer } from "@/components/patient/NextDoseTimer";
import { useAuth } from "@/lib/auth";
import { patientCheckins, patientAppointments, fmtRelative } from "@/lib/mockData";
import { listDoseLogs, listPrescriptions, api } from "@/lib/api";
import { hasVoiceSampleToday } from "@/lib/voice";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Home — NeuroTrack" },
      { name: "description", content: "Your daily NeuroTrack home: today's tasks, streak, and next appointment." },
      { property: "og:title", content: "Home — NeuroTrack" },
      { property: "og:description", content: "Your calm daily overview." },
    ],
  }),
  component: Home,
});

function Home() {
  const { user } = useAuth();
  const streak = 12;
  const adherence = Math.round(
    (patientCheckins.filter((c) => c.medTaken).length / patientCheckins.length) * 100,
  );
  const nextAppt = patientAppointments.find((a) => a.status === "scheduled");

  return (
    <div className="px-5 pb-6 pt-6">
      <header className="flex items-center justify-between">
        <Logo />
        <span className="rounded-full bg-primary-soft px-3 py-1 text-[11px] font-medium text-primary">
          {streak}-day streak
        </span>
      </header>

      <div className="mt-6">
        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{greeting()}</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
          Hello, {user?.name ? user.name.split(" ")[0] : "Tendai"}
        </h1>
      </div>

      {/* Today card */}
      <TodayCard />

      {/* Stat row */}
      <section className="mt-4 grid grid-cols-2 gap-3">
        <div className="surface-card p-4">
          <p className="text-xs text-muted-foreground">7-day adherence</p>
          <p className="mt-1 font-display text-2xl font-semibold text-foreground">{adherence}%</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${adherence}%` }} />
          </div>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs text-muted-foreground">Voice stability · 14d</p>
          <Sparkline
            className="mt-1 h-10 w-full"
            values={patientCheckins.map((c) => c.voice.stability)}
          />
        </div>
      </section>

      {/* Next dose timer & appointment */}
      <section className="mt-4 space-y-3">
        <NextDoseTimer />

        {nextAppt && (
          <Link
            to="/app/care"
            className="surface-card flex items-center gap-4 p-4 transition hover:bg-primary-soft/30"
          >
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-sm font-semibold text-foreground">
                {nextAppt.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {nextAppt.clinician} · {fmtRelative(nextAppt.when)}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        )}
      </section>

      <p className="mt-8 rounded-lg border border-border bg-card p-3 text-center text-xs text-muted-foreground">
        NeuroTrack surfaces voice and medication trends for clinicians — it does not diagnose
        or change your medication.
      </p>
    </div>
  );
}

/** Today's real tasks: one row per active prescription plus the voice sample. */
function TodayCard() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const prescriptions = useQuery({ queryKey: ["prescriptions"], queryFn: () => listPrescriptions() });
  const logs = useQuery({ queryKey: ["dose-logs"], queryFn: () => listDoseLogs() });

  const day = new Date().toISOString().slice(0, 10);

  // Safely check active status
  const active = (prescriptions.data ?? []).filter((p: any) => p.is_active !== false);

  const loggedToday = new Set(
    (logs.data ?? [])
      .filter((l: any) => ((l.actual_time ?? l.scheduled_time ?? l.timestamp) || "").slice(0, 10) === day)
      .map((l: any) => l.prescription ?? l.id),
  );

  const tasks = [
    ...active.map((p: any) => ({
      key: `p${p.id}`,
      id: p.id,
      type: "medication",
      icon: Pill,
      label: `Confirm ${p.medication_name ? p.medication_name.split(" (")[0] : "Medication"}`,
      meta: `${p.dosage_mg} · ${p.doses_per_day ?? p.daily_dose_rate ?? 3}× daily`,
      done: loggedToday.has(p.id),
    })),
    {
      key: "voice",
      type: "voice",
      icon: Mic,
      label: "10-second voice sample",
      meta: "Sustained “aaah”",
      done: hasVoiceSampleToday(),
    },
  ];
  const remaining = tasks.filter((t) => !t.done).length;

  const handleVoiceUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await api.uploadVoiceSample(file, 1);
      alert("Voice sample uploaded successfully to Django backend!");
      queryClient.invalidateQueries({ queryKey: ["dose-logs"] });
    } catch (err) {
      console.error(err);
      alert("Failed to upload voice sample.");
    }
  };

  return (
    <section className="surface-card mt-6 overflow-hidden">
      {/* Hidden file input for audio selection */}
      <input
        type="file"
        ref={fileInputRef}
        accept="audio/*"
        onChange={handleVoiceUpload}
        className="hidden"
      />

      <div className="flex items-center justify-between px-5 pt-5">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Today's check-in</p>
          <p className="mt-0.5 font-display text-lg font-semibold">
            {prescriptions.isLoading
              ? "Loading…"
              : remaining === 0
                ? "All done for today"
                : `${remaining} thing${remaining > 1 ? "s" : ""} left`}
          </p>
        </div>
        <Link
          to="/app/checkin"
          className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-[var(--shadow-card)]"
        >
          {remaining === 0 ? "Review" : "Start"}
        </Link>
      </div>

      <ul className="mt-4 divide-y divide-border">
        {tasks.map((t) => (
          <li
            key={t.key}
            onClick={() => {
              if (t.type === "voice" && !t.done) {
                fileInputRef.current?.click();
              }
            }}
            className={`flex items-center gap-3 px-5 py-3 ${
              t.type === "voice" && !t.done ? "cursor-pointer hover:bg-muted/40 transition" : ""
            }`}
          >
            <span
              className={`grid h-8 w-8 flex-none place-items-center rounded-full ${
                t.done ? "bg-success text-success-foreground" : "bg-primary-soft text-primary"
              }`}
            >
              {t.done ? <Check className="h-4 w-4" /> : <t.icon className="h-4 w-4" />}
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={`block truncate text-sm ${
                  t.done ? "text-muted-foreground line-through" : "text-foreground"
                }`}
              >
                {t.label}
              </span>
              <span className="block truncate text-[11px] text-muted-foreground">{t.meta}</span>
            </span>
            {t.done && <span className="text-xs font-medium text-success">Done</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}