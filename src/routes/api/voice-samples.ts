import { createFileRoute } from "@tanstack/react-router";

/**
 * Voice sample intake. Accepts the multipart take produced by the patient app
 * (16 kHz mono WAV + metadata) and acknowledges it, so the client can mark the
 * sample as delivered. The FastAPI acoustic service will consume the same shape.
 */
export const Route = createFileRoute("/api/voice-samples")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return Response.json({ error: "expected multipart/form-data" }, { status: 400 });
        }

        const file = form.get("file");
        if (!(file instanceof File) || file.size === 0) {
          return Response.json({ error: "file is required" }, { status: 400 });
        }
        if (file.size > 10 * 1024 * 1024) {
          return Response.json({ error: "file too large" }, { status: 413 });
        }

        const duration = Number(form.get("duration_sec"));
        if (!Number.isFinite(duration) || duration <= 0) {
          return Response.json({ error: "duration_sec must be a positive number" }, { status: 400 });
        }

        return Response.json({
          ok: true,
          id: crypto.randomUUID(),
          bytes: file.size,
          duration_sec: Math.round(duration * 100) / 100,
          received_at: new Date().toISOString(),
          analysis_status: "QUEUED",
        });
      },
    },
  },
});
