"use client";

// Copies the household invite code to the clipboard with transient feedback.
import { useState } from "react";
import Button from "@/components/ui/Button";

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
    <Button type="button" variant="secondary" size="sm" onClick={onCopy} aria-label="Copy invite code">
      {copied ? "Copied!" : failed ? "Copy failed" : "Copy"}
    </Button>
  );
}
