import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// POST /api/reminder-deliveries — receipts confirming a dose reminder actually
// reached the patient's device (system notification or in-app banner).
// GET  /api/reminder-deliveries?patient_id=1 — the last receipts, newest first.
//
// Mirrors the planned Django `ReminderDelivery` model. In-memory until the
// database is wired up; the client already retries these posts with backoff, so
// duplicate ids are upserted rather than appended.

interface DeliveryRow {
  id: string;
  patient_id: number;
  prescription_id: number;
  scheduled_at: string;
  delivered_at: string | null;
  channel: string;
  status: string;
  attempts: number;
  timezone: string;
  received_at: string;
}

const rows = new Map<string, DeliveryRow>();

const schema = z.object({
  id: z.string().min(1).max(200),
  patient_id: z.coerce.number().int().positive().default(1),
  prescription_id: z.coerce.number().int().positive(),
  scheduled_at: z.string().min(1),
  delivered_at: z.string().nullable().optional(),
  channel: z.enum(["system", "in-app"]),
  status: z.enum(["pending", "delivered", "failed", "acknowledged"]),
  attempts: z.coerce.number().int().min(0).max(20),
  timezone: z.string().min(1).max(64),
});

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export const Route = createFileRoute("/api/reminder-deliveries")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const raw = new URL(request.url).searchParams.get("patient_id") ?? "1";
        const parsed = z.coerce.number().int().positive().safeParse(raw);
        if (!parsed.success) return json({ error: "invalid patient_id" }, 400);
        const results = [...rows.values()]
          .filter((r) => r.patient_id === parsed.data)
          .sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at))
          .slice(0, 50);
        return json({ patient_id: parsed.data, results });
      },

      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ error: "invalid JSON body" }, 400);
        }
        const parsed = schema.safeParse(body);
        if (!parsed.success) {
          return json({ error: "validation failed", issues: parsed.error.issues }, 422);
        }
        const row: DeliveryRow = {
          ...parsed.data,
          delivered_at: parsed.data.delivered_at ?? null,
          received_at: new Date().toISOString(),
        };
        rows.set(row.id, row);
        return json({ ok: true, id: row.id });
      },
    },
  },
});
