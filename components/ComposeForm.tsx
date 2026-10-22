"use client";

import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { NAME_TOKEN } from "@/lib/template";
import { RichTextEditor, type RichTextEditorHandle } from "./RichTextEditor";

export const RECIPIENTS_INPUT_ID = "recipients-file";

interface ComposeFormProps {
  subject: string;
  campaignName: string;
  initialMessage: string;
  sender: string;
  disabled?: boolean;
  onSubjectChange: (value: string) => void;
  onCampaignNameChange: (value: string) => void;
  onMessageChange: (html: string) => void;
  onFileDrop: (file: File) => void;
  /** The To field (UploadZone). */
  recipients: ReactNode;
  /** Shown at the right of the title bar (SendButton). */
  actions: ReactNode;
  /** Shown under the title bar: send confirmation or errors. */
  banner?: ReactNode;
  /** Footer status line. */
  status: ReactNode;
}

function Row({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  const Label = htmlFor ? "label" : "span";
  return (
    <div className="flex min-h-12 items-center gap-3 border-b border-border px-5 transition-colors duration-150 focus-within:bg-surface-2/60">
      <Label htmlFor={htmlFor} className="w-20 shrink-0 text-sm text-subtle">
        {label}:
      </Label>
      <div className="min-w-0 flex-1 py-2">{children}</div>
    </div>
  );
}

export function ComposeForm({
  subject,
  campaignName,
  initialMessage,
  sender,
  disabled,
  onSubjectChange,
  onCampaignNameChange,
  onMessageChange,
  onFileDrop,
  recipients,
  actions,
  banner,
  status,
}: ComposeFormProps) {
  const subjectRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<RichTextEditorHandle>(null);
  const lastField = useRef<"subject" | "body">("body");
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);

  const insertToken = () => {
    if (lastField.current === "body") {
      editorRef.current?.insertText(NAME_TOKEN);
      return;
    }
    const el = subjectRef.current;
    const start = el?.selectionStart ?? subject.length;
    const end = el?.selectionEnd ?? subject.length;
    onSubjectChange(subject.slice(0, start) + NAME_TOKEN + subject.slice(end));
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const caret = start + NAME_TOKEN.length;
      el.setSelectionRange(caret, caret);
    });
  };

  // Drop a spreadsheet anywhere on the window. Counting enter/leave avoids flicker over children.
  const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer.types).includes("Files");
  const dragHandlers = {
    onDragEnter: (e: DragEvent) => {
      if (!hasFiles(e) || disabled) return;
      e.preventDefault();
      dragDepth.current += 1;
      setDragging(true);
    },
    onDragOver: (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = disabled ? "none" : "copy";
    },
    onDragLeave: (e: DragEvent) => {
      if (!hasFiles(e)) return;
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragging(false);
    },
    onDrop: (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && !disabled) onFileDrop(file);
    },
  };

  return (
    <form
      aria-labelledby="compose-title"
      noValidate
      onSubmit={(e) => e.preventDefault()}
      className="relative overflow-hidden rounded-2xl border border-border bg-surface shadow-soft"
      {...dragHandlers}
    >
      <div className="flex h-14 items-center justify-between gap-4 border-b border-border px-5">
        <h2 id="compose-title" className="font-serif text-lg font-semibold text-fg">
          New Message
        </h2>
        {actions}
      </div>

      {banner}

      <Row label="To" htmlFor={RECIPIENTS_INPUT_ID}>
        {recipients}
      </Row>

      <Row label="Subject" htmlFor="compose-subject">
        <input
          ref={subjectRef}
          id="compose-subject"
          type="text"
          value={subject}
          disabled={disabled}
          autoComplete="off"
          placeholder="Your invitation to the annual meet, {{name}}"
          onFocus={() => (lastField.current = "subject")}
          onChange={(e) => onSubjectChange(e.target.value)}
          className="w-full bg-transparent text-sm font-medium text-fg placeholder:font-normal placeholder:text-subtle focus-visible:outline-none disabled:opacity-60"
        />
      </Row>

      <Row label="Campaign" htmlFor="compose-campaign">
        <input
          id="compose-campaign"
          type="text"
          value={campaignName}
          disabled={disabled}
          autoComplete="off"
          maxLength={120}
          placeholder="Optional · e.g. Diwali greetings 2026"
          onChange={(e) => onCampaignNameChange(e.target.value)}
          className="w-full bg-transparent text-sm text-fg placeholder:text-subtle focus-visible:outline-none disabled:opacity-60"
        />
      </Row>

      {sender && (
        <Row label="From">
          <span className="text-sm text-fg">{sender}</span>
        </Row>
      )}

      <span id="compose-body-label" className="sr-only">
        Message
      </span>
      <RichTextEditor
        ref={editorRef}
        id="compose-body"
        labelledBy="compose-body-label"
        initialHtml={initialMessage}
        disabled={disabled}
        placeholder={"Dear {{name}},\n\nWe’d be glad to have you with us…"}
        onChange={onMessageChange}
        onFocus={() => (lastField.current = "body")}
        toolbarEnd={
          <button
            type="button"
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={insertToken}
            title="Insert the recipient’s name where your cursor is"
            className="inline-flex h-8 items-center rounded-md px-2 font-mono text-xs text-accent-text transition-colors duration-150 hover:bg-accent-soft disabled:opacity-50"
          >
            + {NAME_TOKEN}
          </button>
        }
      />

      <div
        aria-live="polite"
        className="flex min-h-10 items-center gap-4 border-t border-border bg-surface-2/60 px-5 py-2 text-xs text-subtle"
      >
        {status}
      </div>

      {dragging && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl border-2 border-dashed border-accent bg-surface/90">
          <p className="text-sm font-medium text-accent-text">Drop to use as the recipient list</p>
        </div>
      )}
    </form>
  );
}
