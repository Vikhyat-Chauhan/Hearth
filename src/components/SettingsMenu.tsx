"use client";

// Account/settings dropdown at the top-right of the header. Consolidates the
// items that are settings rather than day-to-day destinations: the current
// household (name + role), Calendar, and Logout (at the very end).

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SettingsMenu({
  userEmail,
  householdName,
  role,
}: {
  userEmail: string;
  householdName: string | null;
  role: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside-click and Escape.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  function itemClass(href: string) {
    return `flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 ${
      isActive(href) ? "font-medium text-brand-700" : "text-gray-700"
    }`;
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <span aria-hidden="true">⚙</span>
        <span className="hidden sm:inline">Settings</span>
        <span aria-hidden="true" className="text-gray-400">▾</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 flex w-56 flex-col rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
        >
          <p className="truncate px-4 py-2 text-xs text-gray-400" title={userEmail}>
            {userEmail}
          </p>

          <Link
            href="/household"
            role="menuitem"
            onClick={() => setOpen(false)}
            aria-current={isActive("/household") ? "page" : undefined}
            className={itemClass("/household")}
          >
            <span aria-hidden="true">🏠</span>
            <span className="min-w-0 flex-1 truncate">{householdName ?? "Set up household"}</span>
            {role && (
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium capitalize text-brand-700">
                {role}
              </span>
            )}
          </Link>

          <Link
            href="/settings/calendar"
            role="menuitem"
            onClick={() => setOpen(false)}
            aria-current={isActive("/settings/calendar") ? "page" : undefined}
            className={itemClass("/settings/calendar")}
          >
            <span aria-hidden="true">📅</span>
            Calendar
          </Link>

          <div className="my-1 border-t border-gray-100" />

          <form action="/auth/signout" method="post">
            <button
              type="submit"
              role="menuitem"
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              Logout
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
