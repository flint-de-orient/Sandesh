"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronRight, Download } from "lucide-react";
import { formatClock, formatDuration, formatNumber } from "@/lib/format";
import { downloadReport } from "@/lib/report";
import type { SendResult } from "@/lib/types";
import { button, card } from "@/lib/ui";
import { StatCard } from "./StatCard";

interface ResultsDashboardProps {
  result: SendResult;
  onBack: () => void;
}

function headline({ sent, failed, skipped }: SendResult): string {
  if (sent === 0 && failed > 0) return "Nothing was sent";
  if (failed === 0 && skipped === 0) return `All ${formatNumber(sent)} emails sent`;
  if (failed > 0) return `Sent ${formatNumber(sent)}, ${formatNumber(failed)} failed`;
  return `Sent ${formatNumber(sent)}, ${formatNumber(skipped)} skipped`;
}

function IssueTable({
  title,
  count,
  detailLabel,
  rows,
  defaultOpen,
}: {
  title: string;
  count: number;
  detailLabel: string;
  rows: { name: string; email: string; detail: string }[];
  defaultOpen: boolean;
}) {
  const empty = rows.length === 0;
  return (
    <details className={`${card} group overflow-hidden`} open={defaultOpen && !empty}>
      <summary
        className={`flex h-12 cursor-pointer list-none items-center gap-2 px-4 text-sm font-medium text-fg select-none [&::-webkit-details-marker]:hidden ${
          empty ? "pointer-events-none text-subtle" : "hover:bg-surface-2"
        }`}
        tabIndex={empty ? -1 : undefined}
      >
        <ChevronRight
          className={`size-4 text-subtle transition-transform duration-150 group-open:rotate-90 ${empty ? "opacity-0" : ""}`}
          aria-hidden
        />
        {title}
        <span className="tabular-nums text-subtle">{formatNumber(count)}</span>
        {empty && <span className="ml-auto text-xs font-normal">None</span>}
      </summary>
      {!empty && (
        <div className="max-h-96 overflow-auto border-t border-border">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="sticky top-0 bg-surface text-xs text-subtle">
              <tr className="border-b border-border">
                <th scope="col" className="py-2 pl-4 pr-3 font-medium">Name</th>
                <th scope="col" className="py-2 pr-3 font-medium">Email</th>
                <th scope="col" className="py-2 pr-4 font-medium">{detailLabel}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.email}-${i}`} className="border-b border-border align-top last:border-0">
                  <td className="py-2 pl-4 pr-3 text-fg">{r.name || <span className="text-subtle">—</span>}</td>
                  <td className="py-2 pr-3 break-all text-muted">{r.email || <span className="text-subtle">—</span>}</td>
                  <td className="py-2 pr-4 text-muted">{r.detail || <span className="text-subtle">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </details>
  );
}

export function ResultsDashboard({ result, onBack }: ResultsDashboardProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [barReady, setBarReady] = useState(false);

  useEffect(() => {
    headingRef.current?.focus();
    const frame = requestAnimationFrame(() => setBarReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const valid = result.validRecipients || result.sent + result.failed;
  const rate = valid > 0 ? Math.min(1, result.sent / valid) : 0;
  const percent = Math.round(rate * 100);
  const started = formatClock(result.startedAt);
  const finished = formatClock(result.finishedAt);
  const hasIssues = result.failedList.length + result.skippedList.length > 0;

  const meta = [
    result.campaignName && `“${result.campaignName}”`,
    result.totalRowsInExcel > 0 && `${formatNumber(result.totalRowsInExcel)} rows in file`,
    started && `Started ${started}`,
    finished && `Finished ${finished}`,
  ].filter((item): item is string => Boolean(item));

  return (
    <section aria-labelledby="results-heading" className="flex flex-col gap-8">
      <div>
        <button type="button" onClick={onBack} className={`${button.ghost} -ml-3 h-8 px-3`}>
          <ArrowLeft className="size-4" aria-hidden />
          Back to compose
        </button>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-wider text-accent-text uppercase">{result.status}</p>
            <h1
              id="results-heading"
              ref={headingRef}
              tabIndex={-1}
              className="mt-1 font-serif text-3xl font-semibold tracking-tight text-fg lining-nums focus:outline-none"
            >
              {headline(result)}
            </h1>
            {meta.length > 0 && <p className="mt-1 text-sm text-subtle">{meta.join(" · ")}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`${button.secondary} h-10 px-4`}
              onClick={() => downloadReport(result)}
              disabled={!hasIssues}
              title={hasIssues ? undefined : "No failed or skipped recipients to report"}
            >
              <Download className="size-4" aria-hidden />
              Download report (CSV)
            </button>
            {result.campaignId && (
              <Link
                href={`/sent?campaignId=${encodeURIComponent(result.campaignId)}`}
                className={`${button.primary} h-10 px-4`}
              >
                View in Sent
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Sent" value={result.sent} tone="success" caption={`of ${formatNumber(valid)} valid`} />
        <StatCard label="Failed" value={result.failed} tone={result.failed ? "danger" : "neutral"} caption="Errored while sending" />
        <StatCard label="Skipped" value={result.skipped} tone={result.skipped ? "warning" : "neutral"} caption="Not attempted" />
        <StatCard label="Duration" value={result.durationSec} format={formatDuration} caption="End to end" />
      </div>

      <div>
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium text-fg">Delivered to valid recipients</span>
          <span className="tabular-nums text-muted">{percent}%</span>
        </div>
        <div
          role="meter"
          aria-label="Delivered to valid recipients"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-valuetext={`${percent}%, ${formatNumber(result.sent)} of ${formatNumber(valid)}`}
          className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2"
        >
          <div
            className="h-full rounded-full bg-gold transition-[width] duration-200 ease-out"
            style={{ width: barReady ? `${rate * 100}%` : 0 }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <IssueTable
          title="Failed"
          count={result.failed}
          detailLabel="Error"
          defaultOpen
          rows={result.failedList.map((r) => ({ name: r.name, email: r.email, detail: r.error }))}
        />
        <IssueTable
          title="Skipped"
          count={result.skipped}
          detailLabel="Reason"
          defaultOpen={result.failedList.length === 0}
          rows={result.skippedList.map((r) => ({ name: r.name, email: r.email, detail: r.reason }))}
        />
      </div>
    </section>
  );
}
