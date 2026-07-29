import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { usePreferences, type FontScale } from "@/lib/preferences";
import { Bell, Globe, Shield, LogOut, HeartPulse, ChevronRight, Type } from "lucide-react";

export const Route = createFileRoute("/app/profile")({
  head: () => ({
    meta: [
      { title: "Profile — NeuroTrack" },
      { name: "description", content: "Manage your profile, language and notification preferences." },
      { property: "og:title", content: "Profile — NeuroTrack" },
      { property: "og:description", content: "Personal info, caregiver, notifications." },
    ],
  }),
  component: Profile,
});

function Profile() {
  const { user, signOut } = useAuth();
  const { fontScale, setFontScale } = usePreferences();
  const navigate = useNavigate();
  const [lang, setLang] = useState<"English" | "Shona" | "Ndebele">("English");
  const [remind, setRemind] = useState(true);
  const [share, setShare] = useState(true);

  if (!user) return null;

  return (
    <div className="px-5 pb-6 pt-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Profile</h1>

      <section className="surface-card mt-5 flex items-center gap-4 p-5">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-primary-soft font-display text-lg font-semibold text-primary">
          {user.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-semibold text-foreground">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
      </section>

      <section className="mt-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Health snapshot</h2>
        <div className="surface-card mt-2 grid grid-cols-3 divide-x divide-border p-3">
          {[
            { k: "Diagnosis", v: "PD · Stage 2" },
            { k: "Age", v: "68" },
            { k: "Since", v: "Mar 2022" },
          ].map((r) => (
            <div key={r.k} className="px-2 text-center">
              <p className="text-[10px] uppercase text-muted-foreground">{r.k}</p>
              <p className="mt-0.5 font-display text-sm font-semibold text-foreground">{r.v}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Accessibility</h2>
        <div className="surface-card mt-2 p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-primary-soft text-primary">
              <Type className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">Text size</p>
              <p className="text-xs text-muted-foreground">Make everything easier to read</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2" role="radiogroup" aria-label="Text size">
            {(
              [
                { key: "sm", label: "A", px: "text-xs" },
                { key: "md", label: "A", px: "text-sm" },
                { key: "lg", label: "A", px: "text-base" },
                { key: "xl", label: "A", px: "text-lg" },
              ] as Array<{ key: FontScale; label: string; px: string }>
            ).map((opt) => {
              const active = fontScale === opt.key;
              return (
                <button
                  key={opt.key}
                  role="radio"
                  aria-checked={active}
                  onClick={() => setFontScale(opt.key)}
                  className={`flex flex-col items-center justify-center rounded-xl border py-2 transition ${
                    active
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className={`font-display font-semibold ${opt.px}`}>{opt.label}</span>
                  <span className="mt-0.5 text-[10px] uppercase tracking-wide">
                    {opt.key === "md" ? "Default" : opt.key.toUpperCase()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mt-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preferences</h2>
        <ul className="surface-card mt-2 divide-y divide-border">
          <Row icon={Globe} label="Language">
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as typeof lang)}
              className="rounded-lg border border-input bg-background px-2 py-1 text-sm"
            >
              <option>English</option>
              <option>Shona</option>
              <option>Ndebele</option>
            </select>
          </Row>
          <Row icon={Bell} label="Daily reminders">
            <Toggle checked={remind} onChange={setRemind} />
          </Row>
          <Row icon={Shield} label="Share data with Cimas">
            <Toggle checked={share} onChange={setShare} />
          </Row>
          <Row icon={HeartPulse} label="Emergency contact" hint="Blessing Moyo · Daughter">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Row>
        </ul>
      </section>

      <button
        onClick={() => {
          signOut();
          navigate({ to: "/" });
        }}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <LogOut className="h-4 w-4" /> Sign out
      </button>

      <p className="mt-6 text-center text-[11px] text-muted-foreground">
        NeuroTrack is decision-support only. Aligned with Zimbabwe's National AI Strategy 2026–2030.
      </p>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  hint,
  children,
}: {
  icon: typeof Bell;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-primary-soft text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </li>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-primary" : "bg-muted"}`}
      aria-pressed={checked}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-card shadow transition-all ${
          checked ? "left-[calc(100%-1.375rem)]" : "left-0.5"
        }`}
      />
    </button>
  );
}
