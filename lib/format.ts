import type { Campaign } from "./types";

const numberFormat = new Intl.NumberFormat("en");

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

/** 48 -> "48s", 134 -> "2m 14s", 3790 -> "1h 3m". */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

/** Stopwatch style: 72000 ms -> "1:12". */
export function formatTimer(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(s / 60);
  const seconds = String(s % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

/** Every timestamp in the app is shown in India time, whatever the viewer's clock says. */
const TIME_ZONE = "Asia/Kolkata";
const clockFormat = new Intl.DateTimeFormat("en-IN", { timeZone: TIME_ZONE, hour: "numeric", minute: "2-digit" });
const dateTimeFormat = new Intl.DateTimeFormat("en-IN", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
const shortDateFormat = new Intl.DateTimeFormat("en-IN", { timeZone: TIME_ZONE, day: "numeric", month: "short" });
const longDateFormat = new Intl.DateTimeFormat("en-IN", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
});
const dayKeyFormat = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });

export function parseDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "4:27 pm" */
export function formatClock(iso: string | null): string | null {
  const date = parseDate(iso);
  return date ? clockFormat.format(date) : null;
}

/** "16 Oct 2026, 4:27 pm" */
export function formatDateTime(iso: string | null): string {
  const date = parseDate(iso);
  return date ? dateTimeFormat.format(date) : "—";
}

/** Table style: "15 Oct, 9:55 am", with the year only when it isn't this year. */
export function formatCompactDateTime(iso: string | null, now = Date.now()): string {
  const date = parseDate(iso);
  if (!date) return "—";
  const sameYear = dayKeyFormat.format(date).slice(0, 4) === dayKeyFormat.format(new Date(now)).slice(0, 4);
  return sameYear ? `${shortDateFormat.format(date)}, ${clockFormat.format(date)}` : dateTimeFormat.format(date);
}

/** Mail-list style: today -> "4:27 pm", this year -> "14 Oct", older -> "14 Oct 2025". */
export function formatListTime(iso: string | null, now = Date.now()): string {
  const date = parseDate(iso);
  if (!date) return "";
  const today = new Date(now);
  if (dayKeyFormat.format(date) === dayKeyFormat.format(today)) return clockFormat.format(date);
  return dayKeyFormat.format(date).slice(0, 4) === dayKeyFormat.format(today).slice(0, 4)
    ? shortDateFormat.format(date)
    : longDateFormat.format(date);
}

/** "just now", "12m ago", "3h ago", "2d ago", then a date. */
export function formatRelative(iso: string | null, now = Date.now()): string {
  const date = parseDate(iso);
  if (!date) return "";
  const minutes = Math.round((now - date.getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatListTime(iso, now);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function plural(n: number, word: string): string {
  return `${formatNumber(n)} ${word}${n === 1 ? "" : "s"}`;
}

/** ["a", "b", "c"] -> "a, b and c". */
export function listPhrase(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** The API's campaign name, else one from the sent log, else its start time. */
export function campaignTitle(c: Pick<Campaign, "campaignName" | "startedAt">, fallbackName?: string): string {
  return c.campaignName || fallbackName || `Campaign of ${formatDateTime(c.startedAt)}`;
}
