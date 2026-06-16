// Shared theme constants. The DB column `profiles.theme` is the durable record;
// the `hearth-theme` cookie mirrors it so the server can render the correct
// `<html class="dark">` on first paint (no flash-of-wrong-theme).
import type { ThemePref } from "./validation";

export type Theme = ThemePref["theme"]; // "light" | "dark" | "system"

export const THEME_COOKIE = "hearth-theme";
export const DEFAULT_THEME: Theme = "system";
// Persist for a year; the cookie is a non-sensitive UI mirror of the DB value.
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

// Whether a resolved theme should apply the dark class on first server render.
// "system" can't be resolved on the server (it needs matchMedia), so the inline
// ThemeScript handles that case client-side before paint.
export function serverPrefersDark(theme: Theme | undefined): boolean {
  return theme === "dark";
}
