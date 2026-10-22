import type {
  Campaign,
  FailedRecipient,
  InboxMessage,
  MailType,
  SendResult,
  SentMail,
  SkippedRecipient,
} from "./types";

/* ---------- Configuration ---------- */

const DEFAULT_API = "https://YOUR-N8N/webhook";

/** Base URL of the n8n webhooks, e.g. https://mailn8n.example.com/webhook */
export const API_BASE = (process.env.NEXT_PUBLIC_SANDESH_API || DEFAULT_API).replace(/\/+$/, "");
/** Serve built-in sample data instead of calling n8n. Nothing is sent. */
export const DEMO_MODE = process.env.NEXT_PUBLIC_SANDESH_DEMO === "true";
export const API_CONFIGURED = DEMO_MODE || API_BASE !== DEFAULT_API;
/** Display only: the real sender is set in the n8n email nodes. */
export const SENDER = process.env.NEXT_PUBLIC_SANDESH_FROM ?? "";

/** Sample data is a separate chunk, only downloaded in demo mode. */
const demo = () => import("./demoData").then((m) => m.demo);

export function apiHost(): string {
  try {
    return new URL(API_BASE).host;
  } catch {
    return API_BASE;
  }
}

export class ApiError extends Error {
  readonly detail?: string;

  constructor(message: string, detail?: string) {
    super(message);
    this.detail = detail;
  }
}

export function toApiError(err: unknown): ApiError {
  return err instanceof ApiError ? err : new ApiError("Something went wrong.", String(err));
}

/* ---------- Transport ---------- */

const PARTIAL_SEND_WARNING =
  "If this happened after a long wait, n8n may already have sent some emails. Check its executions before sending again.";

function endpoint(path: string, params: Record<string, string | number | undefined> = {}): string {
  const url = new URL(`${API_BASE}/${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }
  return url.toString();
}

function snippet(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 240 ? `${clean.slice(0, 240)}…` : clean;
}

async function request(url: string, init?: RequestInit, longRunning = false): Promise<unknown> {
  let response: Response;
  let text: string;
  try {
    response = await fetch(url, { cache: "no-store", ...init });
    text = await response.text();
  } catch {
    throw new ApiError(
      "Couldn't reach n8n.",
      `Check that n8n is running at ${apiHost()}, the workflow is active, and its Webhook node allows this site's origin (CORS).${longRunning ? ` ${PARTIAL_SEND_WARNING}` : ""}`,
    );
  }

  // A proxy in front of n8n gave up waiting; the workflow itself is usually still running.
  if (longRunning && (response.status === 502 || response.status === 504)) {
    throw new ApiError(
      "The server stopped waiting for n8n to finish.",
      "n8n is probably still sending in the background. Check its executions before sending again, and raise the proxy timeout for long lists.",
    );
  }
  if (!response.ok) {
    throw new ApiError(
      `n8n returned an error (${response.status}${response.statusText ? ` ${response.statusText}` : ""}).`,
      snippet(text) || (longRunning ? PARTIAL_SEND_WARNING : undefined),
    );
  }
  if (!text.trim()) {
    throw new ApiError(
      "n8n replied with an empty response.",
      "End the workflow with a “Respond to Webhook” node that returns JSON.",
    );
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError("n8n replied, but not with JSON.", snippet(text));
  }
}

/* ---------- Normalisation: tolerate missing fields and n8n's usual wrappers ---------- */

type Raw = Record<string, unknown>;

function isRecord(value: unknown): value is Raw {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function toText(value: unknown): string {
  return value == null ? "" : String(value);
}

function toBool(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

function toIso(value: unknown): string | null {
  return value ? toText(value) : null;
}

/** Accepts [..], {items:[..]}, {data:[..]} and n8n's [{json:{..}}]. */
function toRecords(raw: unknown): Raw[] {
  const list = Array.isArray(raw) ? raw : isRecord(raw) ? (raw.items ?? raw.data ?? raw.results) : null;
  if (!Array.isArray(list)) throw new ApiError("n8n's reply wasn't a list.", snippet(JSON.stringify(raw)));
  return list.filter(isRecord).map((item) => (isRecord(item.json) ? item.json : item));
}

function toMailType(value: unknown): MailType {
  const type = toText(value).toLowerCase().replace(/[\s_]/g, "-");
  if (type.startsWith("bounce")) return "bounce";
  if (type === "auto-reply" || type === "autoreply") return "auto-reply";
  return "reply";
}

const byNewest = <T>(key: (item: T) => string | null) => (a: T, b: T) =>
  (Date.parse(key(b) ?? "") || 0) - (Date.parse(key(a) ?? "") || 0);

function toInboxMessage(r: Raw): InboxMessage {
  return {
    messageId: toText(r.messageId),
    from: toText(r.from),
    fromName: toText(r.fromName),
    to: toText(r.to),
    subject: toText(r.subject),
    text: toText(r.text),
    html: toText(r.html),
    date: toIso(r.date),
    type: toMailType(r.type),
    read: toBool(r.read),
    matchedEmail: toText(r.matchedEmail),
  };
}

function toSentMail(r: Raw): SentMail {
  return {
    messageId: toText(r.messageId),
    campaignId: toText(r.campaignId),
    campaignName: toText(r.campaignName),
    name: toText(r.name),
    email: toText(r.email),
    subject: toText(r.subject),
    html: toText(r.html),
    status: toText(r.status).toLowerCase() === "failed" ? "failed" : "sent",
    error: toText(r.error),
    sentAt: toIso(r.sentAt),
    source: toText(r.source).toLowerCase() === "webmail" ? "webmail" : "sandesh",
    replied: toBool(r.replied),
    repliedAt: toIso(r.repliedAt),
    bounced: toBool(r.bounced),
  };
}

function durationOf(r: Raw, startedAt: string | null, finishedAt: string | null): number {
  const given = toNumber(r.durationSec);
  if (given || !startedAt || !finishedAt) return given;
  const diff = (Date.parse(finishedAt) - Date.parse(startedAt)) / 1000;
  return Number.isFinite(diff) && diff > 0 ? diff : 0;
}

function toCampaign(r: Raw): Campaign {
  const startedAt = toIso(r.startedAt);
  const finishedAt = toIso(r.finishedAt);
  return {
    campaignId: toText(r.campaignId),
    campaignName: toText(r.campaignName),
    totalRowsInExcel: toNumber(r.totalRowsInExcel),
    validRecipients: toNumber(r.validRecipients),
    sent: toNumber(r.sent),
    failed: toNumber(r.failed),
    skipped: toNumber(r.skipped),
    startedAt,
    finishedAt,
    durationSec: durationOf(r, startedAt, finishedAt),
  };
}

function toSendResult(raw: unknown): SendResult {
  const r = Array.isArray(raw) ? raw[0] : raw;
  if (!isRecord(r) || !("sent" in r || "failed" in r || "skipped" in r)) {
    throw new ApiError("The webhook's reply wasn't in the expected format.", snippet(JSON.stringify(raw)));
  }
  const list = <T>(value: unknown, map: (item: Raw) => T): T[] =>
    Array.isArray(value) ? value.filter(isRecord).map(map) : [];
  const failedList = list<FailedRecipient>(r.failedList, (x) => ({
    name: toText(x.name),
    email: toText(x.email),
    error: toText(x.error),
  }));
  const skippedList = list<SkippedRecipient>(r.skippedList, (x) => ({
    name: toText(x.name),
    email: toText(x.email),
    reason: toText(x.reason),
  }));
  const startedAt = toIso(r.startedAt);
  const finishedAt = toIso(r.finishedAt);
  return {
    status: toText(r.status) || "completed",
    totalRowsInExcel: toNumber(r.totalRowsInExcel),
    validRecipients: toNumber(r.validRecipients),
    sent: toNumber(r.sent),
    failed: toNumber(r.failed ?? failedList.length),
    skipped: toNumber(r.skipped ?? skippedList.length),
    failedList,
    skippedList,
    startedAt,
    finishedAt,
    durationSec: durationOf(r, startedAt, finishedAt),
    campaignId: r.campaignId ? toText(r.campaignId) : null,
    campaignName: toText(r.campaignName),
  };
}

/* ---------- Endpoints ---------- */

/** GET /mail-inbox?type=&limit= — newest first. */
export async function fetchInbox(options: { type?: MailType; limit?: number } = {}): Promise<InboxMessage[]> {
  if (DEMO_MODE) return (await demo()).inbox(options.type, options.limit);
  const raw = await request(endpoint("mail-inbox", { type: options.type, limit: options.limit }));
  return toRecords(raw).map(toInboxMessage).sort(byNewest((m) => m.date));
}

/** GET /mail-sent?campaignId=&limit= — newest first. */
export async function fetchSent(options: { campaignId?: string; limit?: number } = {}): Promise<SentMail[]> {
  if (DEMO_MODE) return (await demo()).sent(options.campaignId, options.limit);
  const raw = await request(endpoint("mail-sent", { campaignId: options.campaignId, limit: options.limit }));
  return toRecords(raw).map(toSentMail).sort(byNewest((m) => m.sentAt));
}

/** GET /mail-campaigns — newest first. */
export async function fetchCampaigns(): Promise<Campaign[]> {
  if (DEMO_MODE) return (await demo()).campaigns();
  const raw = await request(endpoint("mail-campaigns"));
  return toRecords(raw).map(toCampaign).sort(byNewest((c) => c.startedAt));
}

/**
 * POST /mail-read { messageId, read }.
 * Sent as form data rather than JSON: a JSON body forces a CORS preflight (OPTIONS),
 * which the n8n server behind Apache currently answers with a 500.
 */
export async function markRead(messageId: string, read: boolean): Promise<void> {
  if (DEMO_MODE) return (await demo()).markRead(messageId, read);
  const raw = await request(endpoint("mail-read"), {
    method: "POST",
    body: new URLSearchParams({ messageId, read: String(read) }),
  });
  if (isRecord(raw) && raw.ok === false) {
    throw new ApiError("n8n couldn't update the message.", snippet(JSON.stringify(raw)));
  }
}

export interface SendRequest {
  file: File;
  subject: string;
  /** Plain-text version, for workflows that don't read `html`. */
  message: string;
  html: string;
  campaignName?: string;
}

/** POST /bulk-mail (multipart). Can take minutes: the workflow replies when sending is done. */
export async function sendBulkMail({ file, subject, message, html, campaignName }: SendRequest): Promise<SendResult> {
  if (DEMO_MODE) return (await demo()).send({ file, subject, html, campaignName });
  const body = new FormData();
  body.append("file", file, file.name);
  body.append("subject", subject);
  body.append("message", message);
  body.append("html", html);
  if (campaignName?.trim()) body.append("campaignName", campaignName.trim());
  return toSendResult(await request(endpoint("bulk-mail"), { method: "POST", body }, true));
}
