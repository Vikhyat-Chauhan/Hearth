"use client";

// Appearance setting: a 3-way segmented control (Light / Dark / System). Selecting
// an option applies the theme instantly via the ThemeProvider, which also persists
// it to the profile and rolls back the UI if the save fails.

import { useTheme } from "@/components/ThemeProvider";
import type { Theme } from "@/lib/theme";

const OPTIONS: { value: Theme; label: string; icon: string; hint: string }[] = [
  { value: "light", label: "Light", icon: "☀️", hint: "Always the warm light theme." },
  { value: "dark", label: "Dark", icon: "🌙", hint: "Always the dark theme." },
  { value: "system", label: "System", icon: "🖥️", hint: "Follow my device setting." },
];

export default function ThemePrefs() {
  const { theme, setTheme, error } = useTheme();

  return (
    <div className="mt-6 space-y-3">
      <div
        role="radiogroup"
        aria-label="Color theme"
        className="grid grid-cols-3 gap-2 rounded-xl border border-line bg-surface p-2"
      >
        {OPTIONS.map((o) => {
          const active = theme === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(o.value)}
              className={`flex flex-col items-center gap-1 rounded-lg px-3 py-4 text-sm font-medium transition ${
                active
                  ? "bg-brand-600 text-white shadow-card"
                  : "text-muted hover:bg-surface-2"
              }`}
            >
              <span aria-hidden="true" className="text-xl">
                {o.icon}
              </span>
              {o.label}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted">
        {OPTIONS.find((o) => o.value === theme)?.hint}
      </p>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
