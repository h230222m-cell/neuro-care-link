import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { ClinicianSidebar } from "@/components/ClinicianSidebar";
import { useAuth } from "@/lib/auth";
import { Users, Bell, BarChart3 } from "lucide-react";
import { alerts } from "@/lib/mockData";

export const Route = createFileRoute("/clinician")({
  component: ClinicianShell,
});

function ClinicianShell() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && (!user || user.role !== "clinician")) {
      navigate({ to: "/auth", search: { role: "clinician" } });
    }
  }, [user, loading, navigate]);

  if (!user) return null;
  const unread = alerts.filter((a) => !a.acknowledged).length;

  return (
    <div className="min-h-screen bg-background md:flex">
      <ClinicianSidebar />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-6 py-8 pb-24 md:pb-8">
          <Outlet />
        </div>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur md:hidden">
          <ul className="mx-auto flex max-w-2xl justify-around px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1.5">
            {[
              { to: "/clinician", label: "Roster", icon: Users, exact: true },
              { to: "/clinician/alerts", label: "Alerts", icon: Bell, badge: unread },
              { to: "/clinician/analytics", label: "Analytics", icon: BarChart3 },
            ].map((t) => {
              const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
              const Icon = t.icon;
              return (
                <li key={t.to} className="flex-1">
                  <Link
                    to={t.to as never}
                    className={`relative mx-auto flex flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-[11px] font-medium ${
                      active ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    <span className={`grid h-8 w-14 place-items-center rounded-full ${active ? "bg-primary-soft" : ""}`}>
                      <Icon className="h-4.5 w-4.5" strokeWidth={2.2} />
                    </span>
                    {t.label}
                    {t.badge ? (
                      <span className="absolute right-4 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[9px] font-semibold text-destructive-foreground">
                        {t.badge}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </main>
    </div>
  );
}
