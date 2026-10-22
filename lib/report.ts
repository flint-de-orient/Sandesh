import { formatDateTime } from "./format";
import type { SendResult, SentMail } from "./types";

/** Quote every cell and neutralise spreadsheet formula injection (=, +, -, @). */
function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

function stamp(): string {
  return new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
}

export function toCsv(rows: string[][]): string {
  return rows.map((cells) => cells.map(csvCell).join(",")).join("\r\n");
}

export function downloadCsv(filename: string, rows: string[][]): void {
  // BOM so Excel opens non-ASCII names correctly.
  const blob = new Blob(["﻿", toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadReport(result: SendResult): void {
  downloadCsv(`sandesh-report-${stamp()}.csv`, [
    ["status", "name", "email", "detail"],
    ...result.failedList.map((r) => ["failed", r.name, r.email, r.error]),
    ...result.skippedList.map((r) => ["skipped", r.name, r.email, r.reason]),
  ]);
}

export function downloadSentLog(rows: SentMail[]): void {
  downloadCsv(`sandesh-sent-${stamp()}.csv`, [
    ["name", "email", "subject", "campaign", "sent at (IST)", "status", "error", "replied", "replied at (IST)", "bounced", "source"],
    ...rows.map((r) => [
      r.name,
      r.email,
      r.subject,
      r.campaignName,
      formatDateTime(r.sentAt),
      r.status,
      r.error,
      r.replied ? "yes" : "no",
      r.repliedAt ? formatDateTime(r.repliedAt) : "",
      r.bounced ? "yes" : "no",
      r.source,
    ]),
  ]);
}
