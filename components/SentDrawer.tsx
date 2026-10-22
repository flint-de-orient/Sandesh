"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { formatDateTime, formatRelative } from "@/lib/format";
import type { SentMail } from "@/lib/types";
import { button } from "@/lib/ui";
import { SourceChip } from "./ui/Chips";
import { EmailFrame } from "./ui/EmailFrame";

interface SentDrawerProps {
  mail: SentMail;
  campaignLabel: string;
  onClose: () => void;
}

const FOCUSABLE = 'a[href], button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

/** Right-side panel. Traps focus, closes on Escape, returns focus to the row on close. */
export function SentDrawer({ mail, campaignLabel, onClose }: SentDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, []);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab" || !panelRef.current) return;
    const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  };

  const inboxLink = mail.replied || mail.bounced ? `/inbox?q=${encodeURIComponent(mail.email)}` : null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onKeyDown={onKeyDown}>
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/60"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className="relative flex h-full w-full max-w-xl animate-[drawer-in_160ms_ease-out] flex-col border-l border-border bg-surface shadow-soft"
      >
        <div className="flex items-start gap-3 border-b border-border px-6 py-5">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-subtle">Sent email</p>
            <h2 id="drawer-title" className="mt-1 font-serif text-xl leading-snug font-semibold text-fg lining-nums">
              {mail.subject || "(no subject)"}
            </h2>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className={`${button.ghost} size-9`}>
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <dl className="grid grid-cols-[6rem_1fr] gap-x-3 gap-y-2 border-b border-border px-6 py-5 text-sm">
          <dt className="text-subtle">To</dt>
          <dd className="min-w-0 break-words">
            {mail.name && <span className="font-medium text-fg">{mail.name} </span>}
            <span className="text-muted">&lt;{mail.email}&gt;</span>
          </dd>
          <dt className="text-subtle">Campaign</dt>
          <dd className="text-muted">{campaignLabel}</dd>
          <dt className="text-subtle">Sent</dt>
          <dd className="text-muted">{formatDateTime(mail.sentAt)} IST</dd>
          <dt className="text-subtle">Status</dt>
          <dd className={mail.status === "failed" ? "text-danger" : "text-success"}>
            {mail.status === "failed" ? `Failed${mail.error ? `: ${mail.error}` : ""}` : "Sent"}
          </dd>
          <dt className="text-subtle">Reply</dt>
          <dd className="text-muted">
            {mail.replied
              ? `Replied ${formatRelative(mail.repliedAt)}${mail.repliedAt ? ` (${formatDateTime(mail.repliedAt)})` : ""}`
              : mail.bounced
                ? "Bounced"
                : "No reply yet"}
          </dd>
          <dt className="text-subtle">Source</dt>
          <dd>
            <SourceChip source={mail.source} />
          </dd>
        </dl>

        {inboxLink && (
          <div className="border-b border-border px-6 py-3">
            <Link href={inboxLink} className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-text hover:underline">
              {mail.replied ? "Open the reply in Inbox" : "Open the bounce in Inbox"}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        )}

        <div className="min-h-0 flex-1 p-6">
          {mail.html ? (
            <EmailFrame html={mail.html} title={`Sent email: ${mail.subject}`} className="h-full min-h-[20rem]" />
          ) : (
            <p className="text-sm text-muted">No copy of the message body was stored for this email.</p>
          )}
        </div>
      </div>
    </div>
  );
}
