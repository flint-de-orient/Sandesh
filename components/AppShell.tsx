"use client";

import { createContext, useContext, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inbox, MailCheck, Megaphone, SquarePen, type LucideIcon } from "lucide-react";
import { API_CONFIGURED, apiHost, DEMO_MODE, fetchInbox } from "@/lib/api";
import type { InboxMessage } from "@/lib/types";
import { useResource, type Resource } from "@/lib/useResource";

const POLL_MS = 60_000;
export const INBOX_LIMIT = 200;

/** The inbox is loaded once here so the badge and the Inbox page share one list. */
const InboxContext = createContext<Resource<InboxMessage[]> | null>(null);

export function useInbox(): Resource<InboxMessage[]> {
  const inbox = useContext(InboxContext);
  if (!inbox) throw new Error("useInbox must be used inside <AppShell>");
  return inbox;
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV: NavItem[] = [
  { href: "/", label: "Send", icon: SquarePen },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/sent", label: "Sent", icon: MailCheck },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
];

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1.5 text-[11px] font-semibold tabular-nums text-on-accent">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-3 rounded-lg">
      <Image src="/flint-logo.png" alt="" width={36} height={36} priority className="size-9 object-contain" />
      <span className="leading-tight">
        <span className="block text-[15px] font-semibold tracking-tight text-fg">
          Flint <span className="text-accent">De Orient</span>
        </span>
        <span className="block text-xs text-muted">Sandesh</span>
      </span>
    </Link>
  );
}

function ConnectionStatus() {
  if (DEMO_MODE) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-2.5 py-1 text-xs text-accent-text">
        Demo data · nothing is sent
      </span>
    );
  }
  return (
    <span className="flex items-center gap-2 text-xs text-subtle" title={API_CONFIGURED ? apiHost() : undefined}>
      <span className={`size-1.5 shrink-0 rounded-full ${API_CONFIGURED ? "bg-success" : "bg-warning"}`} aria-hidden />
      <span className="truncate">{API_CONFIGURED ? apiHost() : "n8n not configured"}</span>
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const inbox = useResource(() => fetchInbox({ limit: INBOX_LIMIT }), [], { pollMs: POLL_MS });
  const unread = inbox.data?.filter((m) => !m.read).length ?? 0;

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const navLabel = (item: NavItem) =>
    item.href === "/inbox" && unread > 0 ? `${item.label}, ${unread} unread` : item.label;

  return (
    <InboxContext.Provider value={inbox}>
      <div className="min-h-dvh md:flex">
        {/* Desktop: sidebar */}
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border/70 bg-bg/60 px-4 py-5 backdrop-blur md:flex">
          <div className="px-2">
            <Brand />
          </div>
          <nav aria-label="Main" className="mt-8 flex flex-col gap-1">
            {NAV.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  aria-label={navLabel(item)}
                  className={`flex h-10 items-center gap-3 rounded-full px-3 text-sm transition-colors duration-150 ${
                    active ? "bg-accent-soft font-medium text-accent-text" : "text-muted hover:bg-surface-2 hover:text-fg"
                  }`}
                >
                  <item.icon className="size-4 shrink-0" aria-hidden />
                  {item.label}
                  {item.href === "/inbox" && <UnreadBadge count={unread} />}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto px-2">
            <ConnectionStatus />
          </div>
        </aside>

        {/* Mobile: top bar */}
        <header className="sticky top-0 z-30 border-b border-border/70 bg-bg/85 backdrop-blur md:hidden">
          <div className="flex h-14 items-center justify-between gap-4 px-4">
            <Brand />
            <ConnectionStatus />
          </div>
          <nav aria-label="Main" className="flex gap-1 overflow-x-auto px-3 pb-2">
            {NAV.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  aria-label={navLabel(item)}
                  className={`flex h-9 shrink-0 items-center gap-2 rounded-full px-3 text-sm transition-colors duration-150 ${
                    active ? "bg-accent-soft font-medium text-accent-text" : "text-muted hover:text-fg"
                  }`}
                >
                  <item.icon className="size-4 max-sm:hidden" aria-hidden />
                  {item.label}
                  {item.href === "/inbox" && <UnreadBadge count={unread} />}
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </InboxContext.Provider>
  );
}
