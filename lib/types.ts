export type RowStatus = "valid" | "invalid" | "duplicate";

export interface RecipientRow {
  /** 1-based row number as shown in Excel. */
  row: number;
  name: string;
  email: string;
  status: RowStatus;
}

export interface ParsedRecipients {
  fileName: string;
  sheetName: string;
  sheetCount: number;
  nameColumn: string | null;
  emailColumn: string;
  rows: RecipientRow[];
  total: number;
  valid: number;
  invalid: number;
  duplicate: number;
}

export interface FailedRecipient {
  name: string;
  email: string;
  error: string;
}

export interface SkippedRecipient {
  name: string;
  email: string;
  reason: string;
}

export interface SendResult {
  status: string;
  totalRowsInExcel: number;
  validRecipients: number;
  sent: number;
  failed: number;
  skipped: number;
  failedList: FailedRecipient[];
  skippedList: SkippedRecipient[];
  startedAt: string | null;
  finishedAt: string | null;
  durationSec: number;
  /** Returned by newer workflows; links the result to /sent?campaignId=. */
  campaignId: string | null;
  campaignName: string;
}

/* ---------- Mailbox API (n8n webhooks) ---------- */

export type MailType = "reply" | "bounce" | "auto-reply";

/** GET /mail-inbox */
export interface InboxMessage {
  messageId: string;
  from: string;
  fromName: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  date: string | null;
  type: MailType;
  read: boolean;
  /** The recipient address of the sent mail this message answers, if matched. */
  matchedEmail: string;
}

export type SentStatus = "sent" | "failed";
export type SentSource = "sandesh" | "webmail";

/** GET /mail-sent */
export interface SentMail {
  messageId: string;
  campaignId: string;
  campaignName: string;
  name: string;
  email: string;
  subject: string;
  html: string;
  status: SentStatus;
  error: string;
  sentAt: string | null;
  source: SentSource;
  replied: boolean;
  repliedAt: string | null;
  bounced: boolean;
}

/** GET /mail-campaigns. campaignName is optional in the API; the UI falls back to the sent log. */
export interface Campaign {
  campaignId: string;
  campaignName: string;
  totalRowsInExcel: number;
  validRecipients: number;
  sent: number;
  failed: number;
  skipped: number;
  startedAt: string | null;
  finishedAt: string | null;
  durationSec: number;
}
