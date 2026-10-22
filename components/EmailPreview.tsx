"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { renderPreviewHtml } from "@/lib/richText";
import { hasNameToken, NAME_FALLBACK, renderSegments } from "@/lib/template";
import type { RecipientRow } from "@/lib/types";
import { button, card } from "@/lib/ui";

interface EmailPreviewProps {
  subject: string;
  /** Message HTML from the editor. */
  html: string;
  hasMessage: boolean;
  sender: string;
  /** Valid recipients only. When empty, a sample recipient is used. */
  recipients: RecipientRow[];
}

const SAMPLE = { name: "Aisha Khan", email: "aisha.khan@example.com" };

export function EmailPreview({ subject, html, hasMessage, sender, recipients }: EmailPreviewProps) {
  const [index, setIndex] = useState(0);
  const count = recipients.length;
  const current = count ? Math.min(index, count - 1) : 0;
  const recipient = recipients[current] ?? SAMPLE;
  const isSample = count === 0;
  const greetingName = recipient.name || NAME_FALLBACK;
  const nameMissing = !isSample && !recipient.name && (hasNameToken(subject) || hasNameToken(html));

  return (
    <section aria-labelledby="preview-heading">
      <div className="flex h-8 items-center justify-between gap-4">
        <h2 id="preview-heading" className="text-sm font-medium text-fg">
          Preview
        </h2>
        {isSample ? (
          <span className="text-xs text-subtle">Sample recipient</span>
        ) : (
          count > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                className={`${button.ghost} size-8`}
                onClick={() => setIndex(current === 0 ? count - 1 : current - 1)}
                aria-label="Previous recipient"
              >
                <ChevronLeft className="size-4" aria-hidden />
              </button>
              <span className="min-w-16 text-center text-xs tabular-nums text-subtle" aria-live="polite">
                {formatNumber(current + 1)} of {formatNumber(count)}
              </span>
              <button
                type="button"
                className={`${button.ghost} size-8`}
                onClick={() => setIndex(current === count - 1 ? 0 : current + 1)}
                aria-label="Next recipient"
              >
                <ChevronRight className="size-4" aria-hidden />
              </button>
            </div>
          )
        )}
      </div>

      <article className={`${card} mt-2 overflow-hidden`}>
        <dl className="grid grid-cols-[4.5rem_1fr] gap-x-2 gap-y-2 border-b border-border px-5 py-4 text-sm">
          {sender && (
            <>
              <dt className="text-subtle">From</dt>
              <dd className="min-w-0 truncate text-muted">{sender}</dd>
            </>
          )}
          <dt className="text-subtle">To</dt>
          <dd className="min-w-0 truncate text-fg">
            {recipient.name && <span className="font-medium">{recipient.name} </span>}
            <span className="text-muted">&lt;{recipient.email}&gt;</span>
          </dd>
          <dt className="text-subtle">Subject</dt>
          <dd className="min-w-0 font-medium break-words text-fg">
            {subject.trim() ? (
              renderSegments(subject, greetingName).map((segment, i) =>
                segment.personalised ? (
                  <mark key={i} className="rounded-sm bg-accent-soft px-0.5 text-inherit">
                    {segment.text}
                  </mark>
                ) : (
                  <span key={i}>{segment.text}</span>
                ),
              )
            ) : (
              <span className="font-normal text-subtle">No subject yet</span>
            )}
          </dd>
        </dl>
        {hasMessage ? (
          <div
            className="rich-text min-h-56 px-5 py-5 text-sm leading-relaxed break-words text-fg"
            // Sanitised to formatting tags only; see lib/richText.ts.
            dangerouslySetInnerHTML={{ __html: renderPreviewHtml(html, greetingName) }}
          />
        ) : (
          <p className="min-h-56 px-5 py-5 text-sm text-subtle">
            Your message will appear here as each recipient will see it.
          </p>
        )}
      </article>

      {nameMissing && (
        <p className="mt-2 text-xs text-warning">
          This recipient has no name, so {"{{name}}"} becomes “{NAME_FALLBACK}”.
        </p>
      )}
    </section>
  );
}
