"use client";

// Copies the household invite code to the clipboard with transient feedback.
import { useState } from "react";

export default function CopyInviteButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setFailed(false);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setFailed(true);
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label="Copy invite code"
      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
    >
      {copied ? "Copied!" : failed ? "Copy failed" : "Copy"}
    </button>
  );
}
