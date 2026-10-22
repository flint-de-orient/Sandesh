import type { MailType, SentSource } from "@/lib/types";

const TYPE_STYLE: Record<MailType, string> = {
  reply: "bg-success-soft text-success",
  bounce: "bg-danger-soft text-danger",
  "auto-reply": "bg-surface-2 text-muted",
};
const TYPE_LABEL: Record<MailType, string> = { reply: "Reply", bounce: "Bounce", "auto-reply": "Auto-reply" };

export function TypeChip({ type }: { type: MailType }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${TYPE_STYLE[type]}`}>
      {TYPE_LABEL[type]}
    </span>
  );
}

export function SourceChip({ source }: { source: SentSource }) {
  return source === "sandesh" ? (
    <span className="inline-flex rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent-text">Sandesh</span>
  ) : (
    <span className="inline-flex rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted">Webmail</span>
  );
}
