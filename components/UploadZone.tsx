"use client";

import { useRef } from "react";
import { FileSpreadsheet, Loader2, X } from "lucide-react";
import { ACCEPTED_EXTENSIONS } from "@/lib/parseRecipients";
import { plural } from "@/lib/format";
import type { ParsedRecipients } from "@/lib/types";

interface UploadZoneProps {
  inputId: string;
  file: File | null;
  recipients: ParsedRecipients | null;
  parsing: boolean;
  error: string | null;
  disabled?: boolean;
  onFileChange: (file: File | null) => void;
}

const ACCEPT = [
  ...ACCEPTED_EXTENSIONS,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
].join(",");

/** The compose window's To field: a recipient-list chip backed by a file input. */
export function UploadZone({ inputId, file, recipients, parsing, error, disabled, onFileChange }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = `${inputId}-error`;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ACCEPT}
          className="peer sr-only"
          tabIndex={file ? -1 : 0}
          disabled={disabled}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error ? true : undefined}
          onChange={(e) => {
            const next = e.target.files?.[0];
            if (next) onFileChange(next);
            e.target.value = "";
          }}
        />

        {file ? (
          <span className="inline-flex max-w-full items-center rounded-full bg-accent-soft text-sm text-accent-text">
            <button
              type="button"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
              title="Replace the recipient list"
              className="inline-flex min-w-0 items-center gap-2 rounded-l-full py-1 pr-1 pl-3 hover:bg-accent/10 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet className="size-4 shrink-0" aria-hidden />
              <span className="truncate font-medium">{file.name}</span>
              <span className="shrink-0 text-accent-text/80">
                {parsing ? (
                  <Loader2 className="size-3.5 animate-spin" aria-label="Reading file" />
                ) : recipients ? (
                  `· ${plural(recipients.valid, "recipient")}`
                ) : null}
              </span>
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onFileChange(null)}
              aria-label={`Remove ${file.name}`}
              className="inline-flex size-7 items-center justify-center rounded-r-full pr-1 hover:bg-accent/10 disabled:cursor-not-allowed"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </span>
        ) : (
          <span className="text-sm text-subtle">
            Drop an Excel or CSV file anywhere here, or{" "}
            <label
              htmlFor={inputId}
              className="cursor-pointer rounded-sm font-medium text-accent-text hover:underline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
            >
              choose a file
            </label>
          </span>
        )}
      </div>

      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
