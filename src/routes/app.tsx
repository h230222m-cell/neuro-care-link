import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { PatientTabBar } from "@/components/PatientTabBar";
import { PatientSkeleton } from "@/components/patient/PatientSkeleton";
import { PatientError } from "@/components/patient/PatientError";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app")({
  component: PatientShell,
  pendingComponent: PatientSkeleton,
  errorComponent: PatientError,
  pendingMs: 150,
  pendingMinMs: 300,
});

function PatientShell() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && (!user || user.role !== "patient")) {
      navigate({ to: "/auth", search: { role: "patient" } });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <Shell>
        <PatientSkeleton label="Signing you in" />
      </Shell>
    );
  }
  if (!user) return null;

  return (
    <Shell>
      <Outlet />
      <PatientTabBar />
    </Shell>
  );
}

/**
 * Fluid app shell — the same responsive layout on phone, tablet and desktop.
 * No simulated device chrome: it is one app that adapts to the viewport.
 */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-3xl flex-col pb-24">
        {children}
      </div>
    </div>
  );
}
