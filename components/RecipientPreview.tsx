"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { formatNumber } from "@/lib/format";
import type { ParsedRecipients, RowStatus } from "@/lib/types";
import { card } from "@/lib/ui";

interface RecipientPreviewProps {
  data: ParsedRecipients | null;
  parsing: boolean;
  usesNameToken: boolean;
}

type Filter = "all" | Exclude<RowStatus, "valid">;

const MAX_VISIBLE_ROWS = 200;

const STATUS_STYLE: Record<RowStatus, string> = {
  valid: "text-subtle",
  invalid: "bg-danger-soft text-danger",
  duplicate: "bg-warning-soft text-warning",
};

const STATUS_LABEL: Record<RowStatus, string> = {
  valid: "Valid",
  invalid: "Invalid",
  duplicate: "Duplicate",
};

function Heading() {
  return (
    <h2 id="recipients-heading" className="text-sm font-medium text-fg">
      Recipients
    </h2>
  );
}

export function RecipientPreview({ data, parsing, usesNameToken }: RecipientPreviewProps) {
  const [filter, setFilter] = useState<Filter>("all");

  if (!data) {
    return (
      <section aria-labelledby="recipients-heading">
        <div className="flex h-8 items-center">
          <Heading />
        </div>
        <div className="mt-2 rounded-2xl border border-dashed border-border px-5 py-8 text-sm text-subtle">
          {parsing ? (
            <span className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Reading your file…
            </span>
          ) : (
            "Upload a spreadsheet to check every name and address before anything is sent."
          )}
        </div>
      </section>
    );
  }

  const active: Filter = filter !== "all" && data[filter] > 0 ? filter : "all";
  const filtered = active === "all" ? data.rows : data.rows.filter((r) => r.status === active);
  const visible = filtered.slice(0, MAX_VISIBLE_ROWS);
  const flagged = data.invalid + data.duplicate;

  const stats: { label: string; value: number; tone: string }[] = [
    { label: "Rows", value: data.total, tone: "text-fg" },
    { label: "Valid", value: data.valid, tone: "text-fg" },
    { label: "Invalid", value: data.invalid, tone: data.invalid ? "text-danger" : "text-subtle" },
    { label: "Duplicate", value: data.duplicate, tone: data.duplicate ? "text-warning" : "text-subtle" },
  ];

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: data.total },
    { key: "invalid", label: "Invalid", count: data.invalid },
    { key: "duplicate", label: "Duplicate", count: data.duplicate },
  ];

  return (
    <section aria-labelledby="recipients-heading">
      <div className="flex h-8 items-center justify-between gap-4">
        <Heading />
        <span className="truncate text-xs text-subtle" title={data.fileName}>
          Sheet “{data.sheetName}”{data.sheetCount > 1 ? ` (first of ${data.sheetCount})` : ""}
        </span>
      </div>

      <div className={`${card} mt-2 overflow-hidden`}>
        <dl className="grid grid-cols-4 border-b border-border">
          {stats.map((s) => (
            <div key={s.label} className="px-4 py-3 not-last:border-r not-last:border-border">
              <dt className="text-xs text-subtle">{s.label}</dt>
              <dd className={`mt-1 text-lg font-semibold tracking-tight tabular-nums ${s.tone}`}>
                {formatNumber(s.value)}
              </dd>
            </div>
          ))}
        </dl>

        <div className="space-y-1 border-b border-border px-4 py-3 text-xs text-muted">
          <p>
            Email from <span className="font-medium text-fg">“{data.emailColumn}”</span>
            {data.nameColumn && (
              <>
                , name from <span className="font-medium text-fg">“{data.nameColumn}”</span>
              </>
            )}
          </p>
          {!data.nameColumn && (
            <p className={usesNameToken ? "text-warning" : undefined}>
              No Name or Full name column found
              {usesNameToken ? ", so {{name}} becomes “there” for everyone." : "."}
            </p>
          )}
        </div>

        {flagged > 0 && (
          <div role="group" aria-label="Filter rows" className="flex gap-1 border-b border-border px-3 py-2">
            {filters
              .filter((f) => f.key === "all" || f.count > 0)
              .map((f) => (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={active === f.key}
                  onClick={() => setFilter(f.key)}
                  className={`h-7 rounded-md px-2.5 text-xs font-medium transition-colors duration-150 ${
                    active === f.key ? "bg-surface-2 text-fg" : "text-subtle hover:text-fg"
                  }`}
                >
                  {f.label} <span className="tabular-nums text-subtle">{formatNumber(f.count)}</span>
                </button>
              ))}
          </div>
        )}

        <div className="max-h-80 overflow-auto">
          <table className="w-full table-fixed text-left text-sm">
            <caption className="sr-only">Recipients parsed from {data.fileName}</caption>
            <thead className="sticky top-0 bg-surface text-xs text-subtle">
              <tr className="border-b border-border">
                <th scope="col" className="w-14 py-2 pl-4 font-medium">
                  Row
                </th>
                <th scope="col" className="w-[32%] py-2 pr-3 font-medium">
                  Name
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Email
                </th>
                <th scope="col" className="w-24 py-2 pr-4 font-medium">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.row} className="border-b border-border last:border-0">
                  <td className="py-2 pl-4 text-xs tabular-nums text-subtle">{r.row}</td>
                  <td className="truncate py-2 pr-3 text-fg" title={r.name}>
                    {r.name || <span className="text-subtle">—</span>}
                  </td>
                  <td className="truncate py-2 pr-3 text-muted" title={r.email}>
                    {r.email || <span className="text-subtle">Missing</span>}
                  </td>
                  <td className="py-2 pr-4">
                    <span className={`inline-block rounded-sm px-1.5 py-0.5 text-xs font-medium ${STATUS_STYLE[r.status]}`}>
                      {STATUS_LABEL[r.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length > MAX_VISIBLE_ROWS && (
          <p className="border-t border-border px-4 py-2 text-xs text-subtle">
            Showing the first {formatNumber(MAX_VISIBLE_ROWS)} of {formatNumber(filtered.length)} rows.
          </p>
        )}
      </div>

      {flagged > 0 && (
        <p className="mt-2 text-xs text-subtle">
          Invalid and duplicate rows are expected to be skipped by the workflow.
        </p>
      )}
    </section>
  );
}
