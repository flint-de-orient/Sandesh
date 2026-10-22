"use client";

import { Suspense, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useInbox } from "@/components/AppShell";
import { ReadingPane } from "@/components/ReadingPane";
import { TypeChip } from "@/components/ui/Chips";
import { EmptyState, ErrorBanner, PageHeader, Skeleton } from "@/components/ui/Feedback";
import { type ApiError, markRead, toApiError } from "@/lib/api";
import { formatListTime, formatNumber, plural } from "@/lib/format";
import { htmlToText } from "@/lib/richText";
import type { InboxMessage, MailType } from "@/lib/types";

type Filter = "all" | MailType;

const FILTERS: { key: Filter; label: string; empty: string }[] = [
  { key: "all", label: "All", empty: "No replies, bounces or auto-replies yet." },
  { key: "reply", label: "Replies", empty: "No replies yet." },
  { key: "bounce", label: "Bounces", empty: "No bounces, so every address so far has been delivered." },
  { key: "auto-reply", label: "Auto-replies", empty: "No auto-replies yet." },
];

export default function InboxPage() {
  return (
    <Suspense fallback={null}>
      <Inbox />
    </Suspense>
  );
}

function searchable(m: InboxMessage) {
  return `${m.fromName} ${m.from} ${m.subject} ${m.text} ${m.matchedEmail}`.toLowerCase();
}

function preview(m: InboxMessage) {
  return (m.text || htmlToText(m.html)).replace(/\s+/g, " ").slice(0, 160);
}

function Inbox() {
  const inbox = useInbox();
  const params = useSearchParams();
  const initialQuery = params.get("q") ?? "";
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState(initialQuery);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<ApiError | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const messages = useMemo(() => inbox.data ?? [], [inbox.data]);
  const q = query.trim().toLowerCase();
  const visible = useMemo(
    () => messages.filter((m) => (filter === "all" || m.type === filter) && (!q || searchable(m).includes(q))),
    [messages, filter, q],
  );
  const counts: Record<Filter, number> = {
    all: messages.length,
    reply: messages.filter((m) => m.type === "reply").length,
    bounce: messages.filter((m) => m.type === "bounce").length,
    "auto-reply": messages.filter((m) => m.type === "auto-reply").length,
  };
  const unread = messages.filter((m) => !m.read).length;
  const selected = messages.find((m) => m.messageId === selectedId) ?? null;
  const activeIndex = visible.findIndex((m) => m.messageId === selectedId);

  // Optimistic: flip locally (badge updates at once), roll back if n8n refuses.
  const setRead = async (message: InboxMessage, read: boolean) => {
    setActionError(null);
    const apply = (value: boolean) =>
      inbox.update((list) => list.map((m) => (m.messageId === message.messageId ? { ...m, read: value } : m)));
    apply(read);
    try {
      await markRead(message.messageId, read);
    } catch (err) {
      apply(!read);
      setActionError(toApiError(err));
    }
  };

  const open = (message: InboxMessage) => {
    setSelectedId(message.messageId);
    if (!message.read) void setRead(message, true);
  };

  // Arriving from Sent with ?q=<email>: open the newest match once.
  const autoOpened = useRef(false);
  useEffect(() => {
    if (autoOpened.current || !initialQuery || !inbox.data) return;
    autoOpened.current = true;
    if (visible[0]) open(visible[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inbox.data]);

  useEffect(() => {
    if (activeIndex >= 0) document.getElementById(`inbox-row-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const onListKeyDown = (e: KeyboardEvent) => {
    if (!visible.length) return;
    const go = (index: number) => {
      e.preventDefault();
      open(visible[Math.max(0, Math.min(visible.length - 1, index))]);
    };
    switch (e.key) {
      case "ArrowDown":
      case "j":
        go(activeIndex + 1);
        break;
      case "ArrowUp":
      case "k":
        go(activeIndex <= 0 ? 0 : activeIndex - 1);
        break;
      case "Home":
        go(0);
        break;
      case "End":
        go(visible.length - 1);
        break;
      case "Enter":
        if (activeIndex < 0) go(0);
        break;
      case "u":
        if (selected) {
          e.preventDefault();
          void setRead(selected, !selected.read);
        }
        break;
    }
  };

  const emptyMessage = !messages.length
    ? FILTERS[0].empty
    : q
      ? `Nothing matches “${query.trim()}”.`
      : (FILTERS.find((f) => f.key === filter)?.empty ?? "");

  return (
    <div className="flex flex-col md:h-dvh">
      <div className="border-b border-border/70 px-4 pt-8 pb-4 sm:px-6">
        <PageHeader
          title="Inbox"
          description={
            inbox.data
              ? unread
                ? `${plural(unread, "unread message")}. Replies, bounces and auto-replies to your mail.`
                : "All caught up. Replies, bounces and auto-replies to your mail land here."
              : "Replies, bounces and auto-replies to your mail."
          }
        />
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div role="group" aria-label="Filter by type" className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                aria-pressed={filter === f.key}
                onClick={() => setFilter(f.key)}
                className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors duration-150 ${
                  filter === f.key
                    ? "border-accent/50 bg-accent-soft text-accent-text"
                    : "border-border text-muted hover:border-border-strong hover:text-fg"
                }`}
              >
                {f.label}
                {inbox.data && <span className="tabular-nums opacity-70">{formatNumber(counts[f.key])}</span>}
              </button>
            ))}
          </div>
          <label className="relative w-full sm:ml-auto sm:w-72">
            <span className="sr-only">Search messages</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email or subject"
              className="h-9 w-full rounded-full border border-border bg-surface pr-3 pl-9 text-sm text-fg placeholder:text-subtle transition-colors duration-150 hover:border-border-strong focus:border-accent focus:outline-none"
            />
          </label>
        </div>
      </div>

      {inbox.error && (
        <div className="px-4 pt-4 sm:px-6">
          <ErrorBanner error={inbox.error} onRetry={inbox.reload} />
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {/* List */}
        <div className={`${selected ? "hidden md:flex" : "flex"} w-full flex-col md:w-[24rem] md:shrink-0 md:border-r md:border-border/70`}>
          {inbox.loading && !inbox.data ? (
            <div aria-busy="true" aria-label="Loading messages">
              {Array.from({ length: 7 }, (_, i) => (
                <div key={i} className="space-y-2 border-b border-border/60 px-4 py-4 pl-7">
                  <div className="flex justify-between gap-6">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-3 w-10" />
                  </div>
                  <Skeleton className="h-3.5 w-56" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          ) : inbox.data && !visible.length ? (
            <EmptyState>{emptyMessage}</EmptyState>
          ) : (
            <div
              ref={listRef}
              role="listbox"
              aria-label="Messages"
              tabIndex={0}
              aria-activedescendant={activeIndex >= 0 ? `inbox-row-${activeIndex}` : undefined}
              onKeyDown={onListKeyDown}
              className="min-h-0 flex-1 overflow-y-auto focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40 focus-visible:ring-inset"
            >
              {visible.map((m, i) => {
                const isSelected = m.messageId === selectedId;
                return (
                  <div
                    key={m.messageId || i}
                    id={`inbox-row-${i}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      open(m);
                      listRef.current?.focus({ preventScroll: true });
                    }}
                    className={`relative cursor-pointer border-b border-border/60 py-3 pr-4 pl-7 transition-colors duration-150 ${
                      isSelected ? "bg-accent-soft" : "hover:bg-surface-2/70"
                    }`}
                  >
                    {!m.read && (
                      <>
                        <span className="absolute top-[1.15rem] left-3 size-2 rounded-full bg-accent" aria-hidden />
                        <span className="sr-only">Unread. </span>
                      </>
                    )}
                    <div className="flex items-baseline gap-2">
                      <span className={`min-w-0 flex-1 truncate text-sm ${m.read ? "text-muted" : "font-semibold text-fg"}`}>
                        {m.fromName || m.from}
                      </span>
                      <time
                        dateTime={m.date ?? undefined}
                        className={`shrink-0 text-xs ${m.read ? "text-subtle" : "font-medium text-accent-text"}`}
                      >
                        {formatListTime(m.date)}
                      </time>
                    </div>
                    <p className={`mt-0.5 truncate text-sm ${m.read ? "text-muted" : "font-semibold text-fg"}`}>
                      {m.subject || "(no subject)"}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      {m.type !== "reply" && <TypeChip type={m.type} />}
                      <p className="min-w-0 flex-1 truncate text-xs text-subtle">{preview(m)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Reading pane */}
        <div className={`${selected ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col`}>
          {selected ? (
            <ReadingPane
              key={selected.messageId}
              message={selected}
              error={actionError}
              onBack={() => setSelectedId(null)}
              onToggleRead={() => void setRead(selected, !selected.read)}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <EmptyState>Select a message to read it.</EmptyState>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
