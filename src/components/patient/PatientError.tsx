import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { reportLovableError } from "@/lib/lovable-error-reporting";

export function PatientError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "patient_route" });
  }, [error]);

  return (
    <div className="px-5 pt-16 pb-24">
      <div className="surface-card mx-auto max-w-sm p-6 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-warning/15 text-warning-foreground">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="mt-4 font-display text-lg font-semibold">Something went off</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          We couldn't load this screen. Your data is safe — try again in a moment.
        </p>
        {error?.message && (
          <p className="mt-3 rounded-lg bg-muted/60 px-3 py-2 text-left text-[11px] font-mono text-muted-foreground">
            {error.message}
          </p>
        )}
        <div className="mt-5 flex flex-col gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-card)]"
          >
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
          <a
            href="/app"
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-input bg-background px-4 py-2.5 text-sm font-medium text-foreground"
          >
            <Home className="h-4 w-4" /> Back to home
          </a>
        </div>
      </div>
    </div>
  );
}
