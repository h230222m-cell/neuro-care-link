import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// Mock auth for the NeuroTrack prototype. Swap with real Django/JWT calls later
// by replacing the `signIn` / `signOut` implementations — the context shape and
// role model stay the same.

export type Role = "patient" | "clinician";

export interface AuthUser {
  id: string;
  name: string;
  role: Role;
  email: string;
}

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  signIn: (role: Role, name?: string) => void;
  signOut: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);
const STORAGE_KEY = "neurotrack.demo.user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  const signIn = (role: Role, name?: string) => {
    const u: AuthUser = {
      id: crypto.randomUUID(),
      role,
      name: name?.trim() || (role === "patient" ? "Tendai Moyo" : "Dr. Chikafu"),
      email: role === "patient" ? "patient@demo.neurotrack" : "clinician@demo.neurotrack",
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    setUser(u);
  };

  const signOut = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  return <Ctx.Provider value={{ user, loading, signIn, signOut }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
