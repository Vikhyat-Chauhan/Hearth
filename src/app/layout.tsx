import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import Navbar from "@/components/Navbar";
import ToastProvider from "@/components/ui/Toast";
import ConfirmProvider from "@/components/ui/ConfirmDialog";
import { ThemeProvider } from "@/components/ThemeProvider";
import { THEME_COOKIE, DEFAULT_THEME, serverPrefersDark, type Theme } from "@/lib/theme";
import { Analytics } from "@vercel/analytics/next";
import { assertServerEnv } from "@/lib/env";

// Resolve light/dark/system synchronously before paint so there's no flash of the
// wrong theme. Reads the same `hearth-theme` cookie the server used, and resolves
// "system" via matchMedia (which the server can't). Runs in <head> before <body>.
const THEME_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=([^;]*)/);var t=m?decodeURIComponent(m[1]):"system";var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

// Fail fast on a misconfigured deploy: validate required server env at startup.
assertServerEnv();

// Inter for UI text; Fraunces (a warm display serif) for the brand wordmark
// and headings — gives Hearth a homey feel without a new npm dependency.
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Hearth",
  description: "Shared-household chores for students and roommates, synced to Google Calendar.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieTheme = (await cookies()).get(THEME_COOKIE)?.value as Theme | undefined;
  const theme: Theme = cookieTheme ?? DEFAULT_THEME;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${sans.variable} ${display.variable}${serverPrefersDark(theme) ? " dark" : ""}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="font-sans">
        <a
          href="#main-content"
          className="sr-only rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
        >
          Skip to content
        </a>
        <ThemeProvider initial={theme}>
          <ConfirmProvider>
            <ToastProvider>
              <Navbar />
              <div id="main-content" tabIndex={-1} className="relative outline-none">
                {/* Warm top wash so every interior page lifts off the canvas the
                    way the landing does — a fading ember gradient + faint grain.
                    Dimmed on dark so the brand tint doesn't glow over the canvas. */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-gradient-to-b from-brand-50 via-canvas to-transparent dark:from-brand-900/20 dark:via-canvas"
                >
                  <div className="absolute inset-0 bg-hearth-grain opacity-60" />
                </div>
                {children}
              </div>
            </ToastProvider>
          </ConfirmProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
