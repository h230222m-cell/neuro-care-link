import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { PatientTabBar } from "@/components/PatientTabBar";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app")({
  component: PatientShell,
});

function PatientShell() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && (!user || user.role !== "patient")) {
      navigate({ to: "/auth", search: { role: "patient" } });
    }
  }, [user, loading, navigate]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-2xl">
        <Outlet />
      </div>
      <PatientTabBar />
    </div>
  );
}
