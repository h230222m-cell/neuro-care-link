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
      <MobileFrame>
        <PatientSkeleton label="Signing you in" />
      </MobileFrame>
    );
  }
  if (!user) return null;

  return (
    <MobileFrame>
      <div className="relative min-h-[100dvh] pb-24">
        <Outlet />
        <PatientTabBar />
      </div>
    </MobileFrame>
  );
}

/**
 * On mobile viewports we fill the screen edge-to-edge. On desktop we render a
 * centered "phone" frame so the patient app always feels like a native mobile
 * surface rather than a stretched web page.
 */
function MobileFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_600px_at_50%_-10%,color-mix(in_oklab,var(--primary)_16%,transparent),transparent)] bg-background md:py-10">
      <div className="mx-auto min-h-screen w-full max-w-[430px] overflow-hidden bg-background md:min-h-[820px] md:rounded-[2.25rem] md:border md:border-border md:shadow-[0_30px_80px_-30px_color-mix(in_oklab,var(--primary)_35%,transparent)]">
        {children}
      </div>
    </div>
  );
}
