"use client";

import { useEffect, useState, type Ref } from "react";
import { Loader2, Send } from "lucide-react";
import { formatTimer, plural } from "@/lib/format";
import { button } from "@/lib/ui";

interface SendButtonProps {
  ref?: Ref<HTMLButtonElement>;
  recipientCount: number;
  ready: boolean;
  sending: boolean;
  startedAt: number | null;
  onClick: () => void;
}

export function SendButton({ ref, recipientCount, ready, sending, startedAt, onClick }: SendButtonProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!sending) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [sending]);

  return (
    <button
      ref={ref}
      type="button"
      className={`${button.primary} h-8 px-3`}
      disabled={!ready || sending}
      aria-busy={sending}
      aria-label={sending ? "Sending" : ready ? `Send to ${plural(recipientCount, "recipient")}` : "Send"}
      onClick={onClick}
    >
      {sending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
      {sending ? (
        <span>
          Sending… <span className="tabular-nums">{formatTimer(startedAt ? now - startedAt : 0)}</span>
        </span>
      ) : (
        "Send"
      )}
    </button>
  );
}

interface ConfirmSendBarProps {
  recipientCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Inline "sheet" under the title bar: a last check before an irreversible bulk send. */
export function ConfirmSendBar({ recipientCount, onCancel, onConfirm }: ConfirmSendBarProps) {
  return (
    <div
      role="group"
      aria-labelledby="confirm-title"
      onKeyDown={(e) => e.key === "Escape" && onCancel()}
      className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-surface-2 px-5 py-3"
    >
      <div className="text-sm">
        <p id="confirm-title" className="font-medium text-fg">
          Send {plural(recipientCount, "email")} now?
        </p>
        <p className="text-muted">Each person gets their own copy. This can’t be undone.</p>
      </div>
      <div className="flex gap-2">
        <button type="button" className={`${button.secondary} h-8 px-3`} onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className={`${button.primary} h-8 px-3`} onClick={onConfirm} autoFocus>
          Send now
        </button>
      </div>
    </div>
  );
}
