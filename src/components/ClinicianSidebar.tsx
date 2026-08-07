import { Link, useRouterState } from "@tanstack/react-router";
import { Users, Bell, BarChart3, NotebookPen, LogOut } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "@tanstack/react-router";
import { alerts } from "@/lib/mockData";

const items: Array<{ to: string; label: string; icon: typeof Users; exact?: boolean }> = [
  { to: "/clinician", label: "Roster", icon: Users, exact: true },
  { to: "/clinician/alerts", label: "Alerts", icon: Bell },
  { to: "/clinician/diaries", label: "Diaries", icon: NotebookPen },
  { to: "/clinician/analytics", label: "Analytics", icon: BarChart3 },
];

export function ClinicianSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const unread = alerts.filter((a) => !a.acknowledged).length;

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-card md:flex">
      <div className="px-5 py-6">
        <Logo />
      </div>
      <nav className="flex-1 px-3">
        <ul className="space-y-1">
          {items.map((it) => {
            const active = it.exact ? pathname === it.to : pathname.startsWith(it.to);
            const Icon = it.icon;
            return (
              <li key={it.to}>
                <Link
                  to={it.to as never}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-primary-soft text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" strokeWidth={2.2} />
                  <span className="flex-1">{it.label}</span>
                  {it.to === "/clinician/alerts" && unread > 0 && (
                    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-destructive-foreground">
                      {unread}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
            {user?.name.split(" ").map((n) => n[0]).slice(0, 2).join("") ?? "DR"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{user?.name ?? "Clinician"}</p>
            <p className="truncate text-xs text-muted-foreground">Cimas Neurology</p>
          </div>
          <button
            onClick={() => {
              signOut();
              navigate({ to: "/" });
            }}
            title="Sign out"
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
