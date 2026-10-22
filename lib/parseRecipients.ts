import type { WorkBook } from "xlsx";
import type { ParsedRecipients, RecipientRow, RowStatus } from "./types";

export const ACCEPTED_EXTENSIONS = [".xlsx", ".xls", ".csv"] as const;

// Must match the "Prepare Recipients" node in the n8n workflow.
const NAME_HEADERS = new Set(["name", "fullname", "firstname", "customername"]);
const EMAIL_HEADERS = new Set(["email", "emailaddress", "mail", "emailid"]);

/** Same rule as the workflow: catches typos and blanks, not every RFC edge case. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class RecipientParseError extends Error {}

/** "E-mail Address " -> "emailaddress", "Full_Name" -> "fullname". */
function normaliseHeader(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function cellText(value: unknown): string {
  return String(value ?? "").trim();
}

export function hasAcceptedExtension(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export async function parseRecipients(file: File): Promise<ParsedRecipients> {
  if (!hasAcceptedExtension(file.name)) {
    throw new RecipientParseError("Use an .xlsx, .xls or .csv file.");
  }
  if (file.size === 0) {
    throw new RecipientParseError("This file is empty.");
  }

  // Loaded on demand so the parser isn't part of the initial page load.
  const XLSX = await import("xlsx");
  let workbook: WorkBook;
  try {
    workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  } catch {
    throw new RecipientParseError(
      "This file couldn't be read. Check that it opens in Excel and try again.",
    );
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  if (!sheet || !sheet["!ref"]) {
    throw new RecipientParseError("This file is empty.");
  }

  const firstRow = XLSX.utils.decode_range(sheet["!ref"]).s.r;
  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    blankrows: true,
    raw: false,
  });

  const headerIndex = grid.findIndex((cells) => cells.some((c) => cellText(c) !== ""));
  if (headerIndex === -1) {
    throw new RecipientParseError("This file is empty.");
  }

  const headers = grid[headerIndex].map(normaliseHeader);
  const emailIdx = headers.findIndex((h) => EMAIL_HEADERS.has(h));
  const nameIdx = headers.findIndex((h) => NAME_HEADERS.has(h));

  if (emailIdx === -1) {
    throw new RecipientParseError(
      "No email column found. The first row needs a header called “Email”, “E-mail”, “Email address” or “Email ID”.",
    );
  }

  const seen = new Set<string>();
  const rows: RecipientRow[] = [];
  const counts: Record<RowStatus, number> = { valid: 0, invalid: 0, duplicate: 0 };

  for (let i = headerIndex + 1; i < grid.length; i++) {
    const cells = grid[i];
    if (!cells.some((c) => cellText(c) !== "")) continue;

    const email = cellText(cells[emailIdx]);
    const name = nameIdx === -1 ? "" : cellText(cells[nameIdx]);
    const key = email.toLowerCase();

    let status: RowStatus;
    if (!EMAIL_PATTERN.test(email)) status = "invalid";
    else if (seen.has(key)) status = "duplicate";
    else status = "valid";

    seen.add(key);
    counts[status]++;
    rows.push({ row: firstRow + i + 1, name, email, status });
  }

  if (rows.length === 0) {
    throw new RecipientParseError("The file has a header row but no recipients below it.");
  }

  return {
    fileName: file.name,
    sheetName: sheetName ?? "",
    sheetCount: workbook.SheetNames.length,
    nameColumn: nameIdx === -1 ? null : cellText(grid[headerIndex][nameIdx]),
    emailColumn: cellText(grid[headerIndex][emailIdx]),
    rows,
    total: rows.length,
    ...counts,
  };
}
