"use client";

// Client-side theme controller. Holds the active mode (light/dark/system), applies
// the `dark` class on <html> live, mirrors the choice into the `hearth-theme` cookie
// (so the server renders correctly next load), and persists it to the profile via
// PATCH /api/settings/theme. The pre-paint <html> class is set by the inline script
// in layout.tsx; this provider keeps it in sync after hydration and follows the OS
// while in "system" mode.

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Theme } from "@/lib/theme";
import { THEME_COOKIE, THEME_COOKIE_MAX_AGE } from "@/lib/theme";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (next: Theme) => Promise<void>;
  error: string | null;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolvesToDark(theme: Theme): boolean {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", resolvesToDark(theme));
}

function writeCookie(theme: Theme) {
  document.cookie = `${THEME_COOKIE}=${theme};path=/;max-age=${THEME_COOKIE_MAX_AGE};samesite=lax`;
}

export function ThemeProvider({
  initial,
  children,
}: {
  initial: Theme;
  children: React.ReactNode;
}) {
  const [theme, setThemeState] = useState<Theme>(initial);
  const [error, setError] = useState<string | null>(null);

  // Keep the <html> class in sync, and follow the OS while in "system" mode.
  useEffect(() => {
    applyTheme(theme);
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback(
    async (next: Theme) => {
      const prev = theme;
      setError(null);
      setThemeState(next); // optimistic — effect applies the class
      writeCookie(next);
      try {
        const res = await fetch("/api/settings/theme", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme: next }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Couldn't save your theme");
        }
      } catch (err) {
        setThemeState(prev); // roll back
        writeCookie(prev);
        setError(err instanceof Error ? err.message : "Couldn't save your theme");
      }
    },
    [theme],
  );

  return (
    <ThemeContext.Provider value={{ theme, setTheme, error }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
