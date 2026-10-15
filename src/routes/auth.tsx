import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Logo } from "@/components/Logo";
import { useAuth, type Role } from "@/lib/auth";

const searchSchema = z.object({
  role: z.enum(["patient", "clinician"]).optional(),
});

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — NeuroTrack" },
      { name: "description", content: "Sign in to your NeuroTrack patient or clinician account." },
      { property: "og:title", content: "Sign in — NeuroTrack" },
      { property: "og:description", content: "Access your daily check-in or the clinician dashboard." },
    ],
  }),
  validateSearch: searchSchema,
  component: AuthPage,
});

function AuthPage() {
  const { role: initialRole } = Route.useSearch();
  const [role, setRole] = useState<Role>(initialRole ?? "patient");
  const [name, setName] = useState("");
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    signIn(role, name);
    navigate({ to: role === "patient" ? "/app" : "/clinician" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center px-6 py-6">
        <Logo />
      </header>
      <main className="mx-auto flex max-w-md flex-col px-6 pt-6 pb-16">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Prototype sign-in. Real Django + JWT auth plugs in here later.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-2 rounded-full bg-muted p-1">
          {(["patient", "clinician"] as Role[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition ${
                role === r ? "bg-card text-foreground shadow-[var(--shadow-soft)]" : "text-muted-foreground"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-6 surface-card space-y-4 p-6">
          <label className="block">
            <span className="text-sm font-medium text-foreground">
              {role === "patient" ? "Your name" : "Clinician name"}
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder={role === "patient" ? "e.g. Tendai Moyo" : "e.g. Dr. Chikafu"}
              className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none ring-ring focus:border-ring focus:ring-2"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-foreground">Password</span>
            <input
              type="password"
              placeholder="Any password works in the demo"
              className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none ring-ring focus:border-ring focus:ring-2"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-card)] transition hover:opacity-95"
          >
            Continue as {role}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing you agree that NeuroTrack is a decision-support tool and does not
          replace clinical judgement.
        </p>
      </main>
    </div>
  );
}
