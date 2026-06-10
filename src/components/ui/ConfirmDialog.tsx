"use client";

// Accessible confirmation dialog to replace native window.confirm(). Mount
// <ConfirmProvider> once near the app root, then `const confirm = useConfirm()`
// and `if (await confirm({ message })) { ... }` from any client component.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Button from "@/components/ui/Button";

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/** Returns a promise-based confirm(). Falls back to native confirm if unmounted. */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (ctx) return ctx;
  return async (o) => (typeof window === "undefined" ? true : window.confirm(o.message));
}

export default function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);
  const confirmBtn = useRef<HTMLButtonElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    if (typeof document !== "undefined") {
      lastFocused.current = document.activeElement as HTMLElement;
    }
    setState(options);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = useCallback((result: boolean) => {
    resolver.current?.(result);
    resolver.current = null;
    setState(null);
    lastFocused.current?.focus?.();
  }, []);

  useEffect(() => {
    if (!state) return;
    confirmBtn.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [state, close]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close(false);
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-message"
            className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-5 shadow-card-hover"
          >
            <h2 id="confirm-title" className="font-display text-lg font-semibold text-gray-900">
              {state.title ?? "Are you sure?"}
            </h2>
            <p id="confirm-message" className="mt-2 text-sm text-gray-600">
              {state.message}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => close(false)}>
                {state.cancelLabel ?? "Cancel"}
              </Button>
              <Button
                ref={confirmBtn}
                variant={state.destructive ? "danger" : "primary"}
                size="sm"
                onClick={() => close(true)}
              >
                {state.confirmLabel ?? "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
