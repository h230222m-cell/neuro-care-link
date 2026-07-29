import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type FontScale = "sm" | "md" | "lg" | "xl";

const SCALES: Record<FontScale, number> = {
  sm: 0.9375, // 15px
  md: 1, // 16px (default)
  lg: 1.125, // 18px
  xl: 1.25, // 20px
};

const STORAGE_KEY = "neurotrack.fontScale";

type PreferencesCtx = {
  fontScale: FontScale;
  setFontScale: (s: FontScale) => void;
};

const Ctx = createContext<PreferencesCtx | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [fontScale, setFontScaleState] = useState<FontScale>("md");

  // Hydrate from localStorage on mount (client-only to avoid SSR mismatch).
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY) as FontScale | null;
      if (stored && stored in SCALES) setFontScaleState(stored);
    } catch {
      /* ignore */
    }
  }, []);

  // Apply to the root html element so rem-based styles scale everywhere.
  useEffect(() => {
    const root = document.documentElement;
    root.style.fontSize = `${SCALES[fontScale] * 100}%`;
    return () => {
      root.style.fontSize = "";
    };
  }, [fontScale]);

  const setFontScale = (s: FontScale) => {
    setFontScaleState(s);
    try {
      window.localStorage.setItem(STORAGE_KEY, s);
    } catch {
      /* ignore */
    }
  };

  return <Ctx.Provider value={{ fontScale, setFontScale }}>{children}</Ctx.Provider>;
}

export function usePreferences() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePreferences must be used within PreferencesProvider");
  return ctx;
}
