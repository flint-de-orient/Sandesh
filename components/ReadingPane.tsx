"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, MailOpen } from "lucide-react";
import type { ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { htmlToText } from "@/lib/richText";
import type { InboxMessage } from "@/lib/types";
import { button } from "@/lib/ui";
import { TypeChip } from "./ui/Chips";
import { EmailFrame } from "./ui/EmailFrame";
import { ErrorBanner } from "./ui/Feedback";

interface ReadingPaneProps {
  message: InboxMessage;
  error: ApiError | null;
  onBack: () => void;
  onToggleRead: () => void;
}

const segment = (active: boolean) =>
  `h-7 rounded-full px-3 text-xs font-medium transition-colors duration-150 ${
    active ? "bg-surface-2 text-fg" : "text-subtle hover:text-fg"
  }`;

/** Keyed by messageId in the parent, so the HTML/text choice resets per message. */
export function ReadingPane({ message, error, onBack, onToggleRead }: ReadingPaneProps) {
  const [view, setView] = useState<"html" | "text">(message.html ? "html" : "text");
  const subject = message.subject || "(no subject)";
  const text = message.text || htmlToText(message.html);

  return (
    <article aria-labelledby="reading-subject" className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-border/70 px-4 py-4 sm:px-6">
        <button type="button" onClick={onBack} className={`${button.ghost} -ml-3 mb-3 h-8 px-3 md:hidden`}>
          <ArrowLeft className="size-4" aria-hidden />
          Back to list
        </button>

        <div className="flex items-start justify-between gap-4">
          <h2 id="reading-subject" className="font-serif text-xl leading-snug font-semibold text-fg lining-nums">
            {subject}
          </h2>
          <TypeChip type={message.type} />
        </div>

        <dl className="mt-3 grid grid-cols-[3.5rem_1fr] gap-x-2 gap-y-1 text-sm">
          <dt className="text-subtle">From</dt>
          <dd className="min-w-0 truncate">
            {message.fromName && <span className="font-medium text-fg">{message.fromName} </span>}
            <span className="text-muted">&lt;{message.from}&gt;</span>
          </dd>
          <dt className="text-subtle">To</dt>
          <dd className="min-w-0 truncate text-muted">{message.to || "—"}</dd>
          <dt className="text-subtle">Date</dt>
          <dd className="text-muted">{formatDateTime(message.date)} IST</dd>
        </dl>

        {message.matchedEmail && (
          <p className="mt-3 text-xs text-muted">
            In response to your mail to <span className="text-fg">{message.matchedEmail}</span> ·{" "}
            <Link href={`/sent?q=${encodeURIComponent(message.matchedEmail)}`} className="text-accent-text hover:underline">
              View in Sent
            </Link>
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {message.html && (
            <div role="group" aria-label="Show message as" className="flex rounded-full border border-border p-0.5">
              <button type="button" aria-pressed={view === "html"} onClick={() => setView("html")} className={segment(view === "html")}>
                HTML
              </button>
              <button type="button" aria-pressed={view === "text"} onClick={() => setView("text")} className={segment(view === "text")}>
                Plain text
              </button>
            </div>
          )}
          <button type="button" onClick={onToggleRead} className={`${button.secondary} h-8 px-3`}>
            {message.read ? <Mail className="size-3.5" aria-hidden /> : <MailOpen className="size-3.5" aria-hidden />}
            {message.read ? "Mark unread" : "Mark read"}
          </button>
          <span className="ml-auto hidden text-xs text-subtle lg:inline">↑ ↓ to move · U to toggle read</span>
        </div>

        {error && (
          <div className="mt-3">
            <ErrorBanner error={error} />
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        {view === "html" ? (
          <EmailFrame html={message.html} title={`Email: ${subject}`} className="h-full min-h-[28rem]" />
        ) : (
          <pre className="font-sans text-sm leading-relaxed break-words whitespace-pre-wrap text-fg">
            {text || "This message has no text."}
          </pre>
        )}
      </div>
    </article>
  );
}
