import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Pill, NotebookPen, Calendar, User } from "lucide-react";

const tabs: Array<{ to: string; label: string; icon: typeof Home; exact?: boolean }> = [
  { to: "/app", label: "Home", icon: Home, exact: true },
  { to: "/app/meds", label: "Meds", icon: Pill },
  { to: "/app/diary", label: "Diary", icon: NotebookPen },
  { to: "/app/care", label: "Visits", icon: Calendar },
  { to: "/app/profile", label: "Me", icon: User },
];

export function PatientTabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav
      aria-label="Primary"
      className="sticky bottom-0 z-30 mt-auto border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80"
    >
      <ul className="mx-auto flex w-full max-w-3xl items-stretch justify-around px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1.5">
        {tabs.map((t) => {
          const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
          const Icon = t.icon;
          return (
            <li key={t.to} className="flex-1">
              <Link
                to={t.to}
                className={`mx-auto flex flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-[11px] font-medium transition ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span
                  className={`grid h-8 w-14 place-items-center rounded-full transition ${
                    active ? "bg-primary-soft" : "bg-transparent"
                  }`}
                >
                  <Icon className="h-4.5 w-4.5" strokeWidth={2.2} />
                </span>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
