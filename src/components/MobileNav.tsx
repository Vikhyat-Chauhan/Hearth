"use client";

// Client nav link list: a horizontal row on sm+, a hamburger-toggled disclosure
// on mobile. Highlights the active route (aria-current) using the current path.

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLink = { href: string; label: string };

export default function MobileNav({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  function linkClass(href: string) {
    return isActive(href)
      ? "font-medium text-gray-900"
      : "text-gray-600 hover:text-gray-900";
  }

  return (
    <>
      {/* Desktop / tablet: inline row */}
      <div className="hidden items-center gap-4 text-sm sm:flex">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            aria-current={isActive(l.href) ? "page" : undefined}
            className={linkClass(l.href)}
          >
            {l.label}
          </Link>
        ))}
      </div>

      {/* Mobile: hamburger toggle + dropdown panel */}
      <div className="relative sm:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Toggle navigation menu"
          className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-gray-700 hover:bg-gray-50"
        >
          <span aria-hidden="true">{open ? "✕" : "☰"}</span>
        </button>
        {open && (
          <div className="absolute right-0 z-20 mt-2 flex w-44 flex-col rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-lg">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                aria-current={isActive(l.href) ? "page" : undefined}
                className={`px-4 py-2 hover:bg-gray-50 ${
                  isActive(l.href) ? "font-medium text-gray-900" : "text-gray-600"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
