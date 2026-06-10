import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import ToastProvider from "@/components/ui/Toast";
import ConfirmProvider from "@/components/ui/ConfirmDialog";
import { Analytics } from "@vercel/analytics/next";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body className="font-sans">
        <a
          href="#main-content"
          className="sr-only rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
        >
          Skip to content
        </a>
        <ConfirmProvider>
          <ToastProvider>
            <Navbar />
            <div id="main-content" tabIndex={-1} className="relative outline-none">
              {/* Warm top wash so every interior page lifts off the canvas the
                  way the landing does — a fading ember gradient + faint grain. */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-gradient-to-b from-brand-50 via-stone-50 to-transparent"
              >
                <div className="absolute inset-0 bg-hearth-grain opacity-60" />
              </div>
              {children}
            </div>
          </ToastProvider>
        </ConfirmProvider>
        <Analytics />
      </body>
    </html>
  );
}
