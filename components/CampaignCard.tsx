import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { campaignTitle, formatDateTime, formatDuration, formatNumber, plural } from "@/lib/format";
import type { Campaign } from "@/lib/types";

interface CampaignCardProps {
  campaign: Campaign;
  /** From the sent log; null while unknown. */
  replies: number | null;
  fallbackName?: string;
}

export function CampaignCard({ campaign: c, replies, fallbackName }: CampaignCardProps) {
  const total = c.sent + c.failed + c.skipped || c.totalRowsInExcel;
  const pct = (n: number) => (total ? `${(n / total) * 100}%` : "0%");
  const replyRate = replies !== null && c.sent ? Math.round((replies / c.sent) * 100) : null;
  const title = campaignTitle(c, fallbackName);

  const stats = [
    { label: "Sent", value: c.sent, dot: "bg-accent" },
    { label: "Failed", value: c.failed, dot: "bg-danger" },
    { label: "Skipped", value: c.skipped, dot: "bg-warning" },
    { label: "Replies", value: replies, dot: "bg-success" },
  ];

  return (
    <Link
      href={`/sent?campaignId=${encodeURIComponent(c.campaignId)}`}
      className="group block rounded-2xl border border-border bg-surface p-5 transition-[border-color,box-shadow] duration-150 hover:border-accent/40 hover:shadow-soft"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-serif text-lg font-semibold text-fg lining-nums">{title}</h2>
          <p className="mt-0.5 text-xs text-subtle">
            {formatDateTime(c.startedAt)} · {formatDuration(c.durationSec)} · {plural(c.totalRowsInExcel, "row")}
          </p>
        </div>
        <ChevronRight
          className="mt-1 size-4 shrink-0 text-subtle transition-[color,transform] duration-150 group-hover:translate-x-0.5 group-hover:text-accent-text"
          aria-hidden
        />
      </div>

      <dl className="mt-5 grid grid-cols-4 gap-2">
        {stats.map((s) => (
          <div key={s.label}>
            <dt className="flex items-center gap-1.5 text-xs text-muted">
              <span className={`size-1.5 rounded-full ${s.dot}`} aria-hidden />
              {s.label}
            </dt>
            <dd className="mt-1 text-xl font-semibold tracking-tight text-fg tabular-nums">
              {s.value === null ? "—" : formatNumber(s.value)}
            </dd>
          </div>
        ))}
      </dl>

      <div
        role="img"
        aria-label={`${c.sent} sent, ${c.failed} failed, ${c.skipped} skipped out of ${total}`}
        className="mt-4 flex h-2 overflow-hidden rounded-full bg-surface-2"
      >
        <span className="h-full bg-gold" style={{ width: pct(c.sent) }} />
        <span className="h-full bg-danger" style={{ width: pct(c.failed) }} />
        <span className="h-full bg-warning" style={{ width: pct(c.skipped) }} />
      </div>
      {replyRate !== null && <p className="mt-2 text-xs text-subtle">{replyRate}% of delivered emails got a reply</p>}
    </Link>
  );
}
