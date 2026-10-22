"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import { ComposeForm, RECIPIENTS_INPUT_ID } from "@/components/ComposeForm";
import { EmailPreview } from "@/components/EmailPreview";
import { RecipientPreview } from "@/components/RecipientPreview";
import { ResultsDashboard } from "@/components/ResultsDashboard";
import { ConfirmSendBar, SendButton } from "@/components/SendButton";
import { UploadZone } from "@/components/UploadZone";
import { listPhrase, plural } from "@/lib/format";
import { parseRecipients, RecipientParseError } from "@/lib/parseRecipients";
import { htmlToText, sanitizeHtml } from "@/lib/richText";
import { API_CONFIGURED, ApiError, sendBulkMail, SENDER } from "@/lib/api";
import { hasNameToken } from "@/lib/template";
import type { ParsedRecipients, SendResult } from "@/lib/types";

interface FailureNotice {
  message: string;
  detail?: string;
}

export default function Home() {
  const [subject, setSubject] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [recipients, setRecipients] = useState<ParsedRecipients | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [result, setResult] = useState<SendResult | null>(null);
  const [failure, setFailure] = useState<FailureNotice | null>(null);

  const sendRef = useRef<HTMLButtonElement>(null);
  // Ignore results from a file that has since been replaced.
  const parseToken = useRef(0);

  const handleFile = async (next: File | null) => {
    const token = ++parseToken.current;
    setFile(next);
    setRecipients(null);
    setParseError(null);
    setFailure(null);
    setConfirming(false);
    if (!next) return;

    setParsing(true);
    try {
      const parsed = await parseRecipients(next);
      if (token === parseToken.current) setRecipients(parsed);
    } catch (err) {
      if (token !== parseToken.current) return;
      setParseError(
        err instanceof RecipientParseError ? err.message : "This file couldn't be read. Try saving it again as .xlsx.",
      );
    } finally {
      if (token === parseToken.current) setParsing(false);
    }
  };

  const handleSend = async () => {
    setConfirming(false);
    if (!file || sending) return;
    const html = sanitizeHtml(message);
    setSending(true);
    setStartedAt(Date.now());
    setFailure(null);
    try {
      setResult(await sendBulkMail({ file, subject, message: htmlToText(html), html, campaignName }));
    } catch (err) {
      setFailure(
        err instanceof ApiError
          ? { message: err.message, detail: err.detail }
          : { message: "Something went wrong while sending.", detail: String(err) },
      );
    } finally {
      setSending(false);
    }
  };

  const cancelConfirm = () => {
    setConfirming(false);
    requestAnimationFrame(() => sendRef.current?.focus());
  };

  // Leaving mid-request would lose the results report.
  useEffect(() => {
    if (!sending) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [sending]);

  const validRecipients = useMemo(
    () => recipients?.rows.filter((r) => r.status === "valid") ?? [],
    [recipients],
  );
  const hasMessage = useMemo(() => htmlToText(message) !== "", [message]);
  const usesNameToken = hasNameToken(subject) || hasNameToken(message);
  const flagged = recipients ? recipients.invalid + recipients.duplicate : 0;

  const missing = [
    !recipients && "a recipient list",
    recipients && validRecipients.length === 0 && "at least one valid email address",
    !subject.trim() && "a subject",
    !hasMessage && "a message",
  ].filter((item): item is string => Boolean(item));
  const ready = missing.length === 0;

  const status = sending
    ? `Sending ${plural(validRecipients.length, "email")}. Keep this tab open; large lists can take several minutes.`
    : ready
      ? `Ready to send to ${plural(validRecipients.length, "recipient")}${
          flagged ? ` · ${plural(flagged, "row")} will be skipped` : ""
        }.`
      : `To send, add ${listPhrase(missing)}.`;

  const banner = confirming && ready && !sending ? (
    <ConfirmSendBar recipientCount={validRecipients.length} onCancel={cancelConfirm} onConfirm={handleSend} />
  ) : failure ? (
    <div role="alert" className="flex gap-3 border-b border-danger/30 bg-danger-soft px-5 py-3 text-sm">
      <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
      <div className="min-w-0">
        <p className="font-medium text-fg">{failure.message}</p>
        {failure.detail && <p className="mt-1 break-words text-muted">{failure.detail}</p>}
      </div>
    </div>
  ) : null;

  return (
    <div>
      <div className="mx-auto w-full max-w-[960px] px-4 py-10 sm:px-6">
        {result ? (
          <ResultsDashboard result={result} onBack={() => setResult(null)} />
        ) : (
          <>
            <div className="mb-8">
              <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 py-1 pr-3 pl-1 text-xs text-muted">
                <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-semibold tracking-wider text-on-accent">
                  SANDESH
                </span>
                Personalised bulk mail
              </p>
              <h1 className="mt-4 font-serif text-4xl leading-tight font-semibold tracking-tight text-fg sm:text-5xl">
                Send letters, <span className="text-accent">not spam.</span>
              </h1>
              <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
                Write once, upload your list, and every person receives a letter addressed to them by name.
              </p>
            </div>

            {!API_CONFIGURED && (
              <p className="mb-6 rounded-2xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-fg">
                Set <code className="font-mono text-[0.9em]">NEXT_PUBLIC_SANDESH_API</code> to your n8n webhook
                base URL, then restart the app. Until then sending will fail.
              </p>
            )}

            <ComposeForm
              subject={subject}
              campaignName={campaignName}
              initialMessage={message}
              sender={SENDER}
              disabled={sending}
              onSubjectChange={setSubject}
              onCampaignNameChange={setCampaignName}
              onMessageChange={setMessage}
              onFileDrop={handleFile}
              banner={banner}
              actions={
                <SendButton
                  ref={sendRef}
                  recipientCount={validRecipients.length}
                  ready={ready}
                  sending={sending}
                  startedAt={startedAt}
                  onClick={() => setConfirming(true)}
                />
              }
              recipients={
                <UploadZone
                  inputId={RECIPIENTS_INPUT_ID}
                  file={file}
                  recipients={recipients}
                  parsing={parsing}
                  error={parseError}
                  disabled={sending}
                  onFileChange={handleFile}
                />
              }
              status={status}
            />

            <div className="mt-10 grid gap-10 md:grid-cols-2 md:gap-8">
              <EmailPreview
                subject={subject}
                html={message}
                hasMessage={hasMessage}
                sender={SENDER}
                recipients={validRecipients}
              />
              <RecipientPreview data={recipients} parsing={parsing} usesNameToken={usesNameToken} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
