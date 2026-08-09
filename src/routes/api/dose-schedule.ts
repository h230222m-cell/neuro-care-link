import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { DEFAULT_DOSE_SCHEDULE, type DoseSchedule } from "@/lib/dose-schedule";

// GET  /api/dose-schedule?patient_id=1  → the patient's pill times + timezone
// PATCH /api/dose-schedule              → update one or more slot times / tz
//
// Mirrors the planned Django `DoseSchedule` model (one row per patient with
// morning_time / afternoon_time / evening_time / night_time / timezone). Backed
// by an in-memory map until the database is wired up — swap the two helpers
// below for real queries and the client needs no changes.

const store = new Map<number, DoseSchedule>();

const timeField = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "expected HH:MM (24-hour)");

const timezoneField = z.string().min(1).refine(
  (tz) => {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  },
  { message: "expected a valid IANA timezone, e.g. Africa/Harare" },
);

const patchSchema = z.object({
  patient_id: z.coerce.number().int().positive().default(1),
  morning_time: timeField.optional(),
  afternoon_time: timeField.optional(),
  evening_time: timeField.optional(),
  night_time: timeField.optional(),
  timezone: timezoneField.optional(),
});

const read = (patientId: number): DoseSchedule =>
  store.get(patientId) ?? { ...DEFAULT_DOSE_SCHEDULE };

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export const Route = createFileRoute("/api/dose-schedule")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const raw = new URL(request.url).searchParams.get("patient_id") ?? "1";
        const parsed = z.coerce.number().int().positive().safeParse(raw);
        if (!parsed.success) return json({ error: "invalid patient_id" }, 400);
        return json({
          patient_id: parsed.data,
          ...read(parsed.data),
          server_time: new Date().toISOString(),
        });
      },

      PATCH: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ error: "invalid JSON body" }, 400);
        }
        const parsed = patchSchema.safeParse(body);
        if (!parsed.success) {
          return json({ error: "validation failed", issues: parsed.error.issues }, 422);
        }
        const { patient_id, ...patch } = parsed.data;
        const next: DoseSchedule = { ...read(patient_id) };
        for (const [k, v] of Object.entries(patch)) {
          if (typeof v === "string") next[k as keyof DoseSchedule] = v;
        }
        store.set(patient_id, next);
        return json({ patient_id, ...next, server_time: new Date().toISOString() });
      },
    },
  },
});
