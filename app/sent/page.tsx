"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, Info, Search } from "lucide-react";
import { SentDrawer } from "@/components/SentDrawer";
import { SourceChip } from "@/components/ui/Chips";
import { EmptyState, ErrorBanner, PageHeader, Skeleton } from "@/components/ui/Feedback";
import { Tooltip } from "@/components/ui/Tooltip";
import { fetchCampaigns, fetchSent } from "@/lib/api";
import { campaignTitle, formatCompactDateTime, formatDateTime, formatNumber, formatRelative } from "@/lib/format";
import { downloadSentLog } from "@/lib/report";
import type { SentMail, SentStatus } from "@/lib/types";
import { button } from "@/lib/ui";
import { useResource } from "@/lib/useResource";

export default function SentPage() {
  return (
    <Suspense fallback={null}>
      <Sent />
    </Suspense>
  );
}

const control =
  "h-9 rounded-full border border-border bg-surface px-3 text-sm text-fg transition-colors duration-150 hover:border-border-strong focus:border-accent focus:outline-none";

function StatusBadge({ mail }: { mail: SentMail }) {
  if (mail.status === "sent") {
    return <span className="inline-flex rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-medium text-success">Sent</span>;
  }
  const badge = (
    <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-2 py-0.5 text-[11px] font-medium text-danger">
      Failed
      {mail.error && <Info className="size-3" aria-hidden />}
    </span>
  );
  return mail.error ? <Tooltip label={mail.error}>{badge}</Tooltip> : badge;
}

function ReplyCell({ mail }: { mail: SentMail }) {
  if (mail.replied) {
    return (
      <span className="whitespace-nowrap text-success" title={mail.repliedAt ? `${formatDateTime(mail.repliedAt)} IST` : undefined}>
        Replied{mail.repliedAt ? ` · ${formatRelative(mail.repliedAt)}` : ""}
      </span>
    );
  }
  if (mail.bounced) return <span className="text-danger">Bounced</span>;
  return <span className="text-subtle">—</span>;
}

const COLUMNS = ["Name", "Email", "Subject", "Campaign", "Sent at (IST)", "Status", "Reply", "Source"];

function Sent() {
  const params = useSearchParams();
  const router = useRouter();
  const campaignId = params.get("campaignId") ?? "";
  const [status, setStatus] = useState<"all" | SentStatus>("all");
  const [repliedOnly, setRepliedOnly] = useState(false);
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [openKey, setOpenKey] = useState<string | null>(null);

  const sent = useResource(() => fetchSent({ campaignId: campaignId || undefined, limit: 1000 }), [campaignId]);
  const campaigns = useResource(fetchCampaigns, []);

  const rows = useMemo(() => sent.data ?? [], [sent.data]);
  const namesFromLog = useMemo(
    () => new Map(rows.filter((r) => r.campaignName).map((r) => [r.campaignId, r.campaignName])),
    [rows],
  );
  const campaignLabel = (mail: SentMail) => {
    if (!mail.campaignId) return mail.source === "webmail" ? "Webmail" : "—";
    const campaign = campaigns.data?.find((c) => c.campaignId === mail.campaignId);
    return mail.campaignName || (campaign ? campaignTitle(campaign) : "Untitled campaign");
  };

  const q = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      rows.filter(
        (r) =>
          (status === "all" || r.status === status) &&
          (!repliedOnly || r.replied) &&
          (!q || `${r.name} ${r.email} ${r.subject} ${r.campaignName}`.toLowerCase().includes(q)),
      ),
    [rows, status, repliedOnly, q],
  );
  const rowKey = (r: SentMail, i: number) => r.messageId || `${r.email}-${i}`;
  const opened = visible.find((r, i) => rowKey(r, i) === openKey) ?? null;
  const filtered = status !== "all" || repliedOnly || q !== "";

  const selectCampaign = (id: string) => {
    router.replace(id ? `/sent?campaignId=${encodeURIComponent(id)}` : "/sent", { scroll: false });
  };

  const campaignOptions = campaigns.data ?? [];
  const unknownSelected = campaignId && !campaignOptions.some((c) => c.campaignId === campaignId);

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6">
      <PageHeader
        title="Sent"
        description="Every email sent from Sandesh and from webmail, with delivery and reply status."
        actions={
          <button
            type="button"
            onClick={() => downloadSentLog(visible)}
            disabled={!visible.length}
            className={`${button.secondary} h-10 px-4`}
          >
            <Download className="size-4" aria-hidden />
            Export CSV
          </button>
        }
      />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <select aria-label="Campaign" value={campaignId} onChange={(e) => selectCampaign(e.target.value)} className={`${control} max-w-64`}>
          <option value="">All campaigns</option>
          {unknownSelected && <option value={campaignId}>{namesFromLog.get(campaignId) ?? "Selected campaign"}</option>}
          {campaignOptions.map((c) => (
            <option key={c.campaignId} value={c.campaignId}>
              {campaignTitle(c, namesFromLog.get(c.campaignId))}
            </option>
          ))}
        </select>
        <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value as "all" | SentStatus)} className={control}>
          <option value="all">All statuses</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
        </select>
        <button
          type="button"
          aria-pressed={repliedOnly}
          onClick={() => setRepliedOnly((v) => !v)}
          className={`h-9 rounded-full border px-3 text-sm transition-colors duration-150 ${
            repliedOnly ? "border-accent/50 bg-accent-soft text-accent-text" : "border-border text-muted hover:border-border-strong hover:text-fg"
          }`}
        >
          Replied only
        </button>
        <label className="relative w-full sm:ml-auto sm:w-72">
          <span className="sr-only">Search sent mail</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email or subject"
            className={`${control} w-full pl-9 placeholder:text-subtle`}
          />
        </label>
      </div>

      {sent.error && (
        <div className="mt-4">
          <ErrorBanner error={sent.error} onRetry={sent.reload} />
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface">
        {sent.data && !visible.length ? (
          <EmptyState>
            {rows.length ? "No emails match these filters." : campaignId ? "No emails were logged for this campaign." : "No emails sent yet."}
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[60rem] text-left text-sm">
              <caption className="sr-only">Sent emails. Select a row to see the message.</caption>
              <thead className="text-xs text-subtle">
                <tr className="border-b border-border">
                  {COLUMNS.map((c, i) => (
                    <th key={c} scope="col" className={`py-3 pr-3 font-medium ${i === 0 ? "pl-4" : ""}`}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody aria-busy={sent.loading}>
                {sent.loading && !sent.data
                  ? Array.from({ length: 8 }, (_, i) => (
                      <tr key={i} className="border-b border-border/60 last:border-0">
                        {COLUMNS.map((c, j) => (
                          <td key={c} className={`py-3.5 pr-3 ${j === 0 ? "pl-4" : ""}`}>
                            <Skeleton className={`h-3.5 ${j === 2 ? "w-48" : j === 1 ? "w-40" : "w-20"}`} />
                          </td>
                        ))}
                      </tr>
                    ))
                  : visible.map((r, i) => {
                      const key = rowKey(r, i);
                      return (
                        <tr
                          key={key}
                          onClick={() => setOpenKey(key)}
                          className="cursor-pointer border-b border-border/60 transition-colors duration-150 last:border-0 hover:bg-surface-2/60"
                        >
                          <td className="py-3 pr-3 pl-4">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenKey(key);
                              }}
                              className="block max-w-[10rem] truncate rounded-sm text-left font-medium text-fg hover:text-accent-text"
                            >
                              {r.name || "—"}
                            </button>
                          </td>
                          <td className="py-3 pr-3 text-muted" title={r.email}>
                            <div className="max-w-[12rem] truncate">{r.email}</div>
                          </td>
                          <td className="py-3 pr-3 text-fg" title={r.subject}>
                            <div className="max-w-[13rem] truncate">{r.subject || "(no subject)"}</div>
                          </td>
                          <td className="py-3 pr-3 text-muted">
                            <div className="max-w-[9rem] truncate">{campaignLabel(r)}</div>
                          </td>
                          <td className="py-3 pr-3 whitespace-nowrap text-muted tabular-nums" title={`${formatDateTime(r.sentAt)} IST`}>
                            {formatCompactDateTime(r.sentAt)}
                          </td>
                          <td className="py-3 pr-3">
                            <StatusBadge mail={r} />
                          </td>
                          <td className="py-3 pr-3">
                            <ReplyCell mail={r} />
                          </td>
                          <td className="py-3 pr-4">
                            <SourceChip source={r.source} />
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {sent.data && rows.length > 0 && (
        <p className="mt-3 text-xs text-subtle">
          {filtered ? `${formatNumber(visible.length)} of ${formatNumber(rows.length)} emails` : `${formatNumber(rows.length)} emails`}
          {" · "}times in IST
        </p>
      )}

      {opened && <SentDrawer mail={opened} campaignLabel={campaignLabel(opened)} onClose={() => setOpenKey(null)} />}
    </div>
  );
}
