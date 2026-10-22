"use client";

import { useMemo } from "react";
import Link from "next/link";
import { SquarePen } from "lucide-react";
import { CampaignCard } from "@/components/CampaignCard";
import { EmptyState, ErrorBanner, PageHeader, Skeleton } from "@/components/ui/Feedback";
import { fetchCampaigns, fetchSent } from "@/lib/api";
import { button } from "@/lib/ui";
import { useResource } from "@/lib/useResource";

export default function CampaignsPage() {
  const campaigns = useResource(fetchCampaigns, []);
  // The campaigns endpoint has no reply counts (and may lack names); both come from the sent log.
  const sent = useResource(() => fetchSent({ limit: 2000 }), []);

  const fromLog = useMemo(() => {
    const replies = new Map<string, number>();
    const names = new Map<string, string>();
    for (const r of sent.data ?? []) {
      if (!r.campaignId) continue;
      if (r.replied) replies.set(r.campaignId, (replies.get(r.campaignId) ?? 0) + 1);
      if (r.campaignName) names.set(r.campaignId, r.campaignName);
    }
    return { replies, names };
  }, [sent.data]);

  const newCampaign = (
    <Link href="/" className={`${button.primary} h-10 px-4`}>
      <SquarePen className="size-4" aria-hidden />
      New campaign
    </Link>
  );

  return (
    <div className="mx-auto max-w-[960px] px-4 py-10 sm:px-6">
      <PageHeader title="Campaigns" description="Every bulk send, newest first. Open one to see who received it." actions={newCampaign} />

      {campaigns.error && (
        <div className="mt-6">
          <ErrorBanner error={campaigns.error} onRetry={campaigns.reload} />
        </div>
      )}
      {sent.error && !campaigns.error && (
        <p className="mt-6 text-xs text-subtle">Reply counts are unavailable: {sent.error.message}</p>
      )}

      {campaigns.loading && !campaigns.data ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2" aria-busy="true" aria-label="Loading campaigns">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-surface p-5">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="mt-2 h-3 w-40" />
              <div className="mt-5 grid grid-cols-4 gap-2">
                {Array.from({ length: 4 }, (_, j) => (
                  <Skeleton key={j} className="h-9 w-14" />
                ))}
              </div>
              <Skeleton className="mt-4 h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      ) : campaigns.data && !campaigns.data.length ? (
        <EmptyState>No campaigns yet. Your first bulk send will appear here.</EmptyState>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {campaigns.data?.map((c) => (
            <CampaignCard
              key={c.campaignId}
              campaign={c}
              fallbackName={fromLog.names.get(c.campaignId)}
              replies={sent.data ? (fromLog.replies.get(c.campaignId) ?? 0) : null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
