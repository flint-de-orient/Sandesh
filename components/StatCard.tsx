"use client";

import { formatNumber } from "@/lib/format";
import { useCountUp } from "@/lib/useCountUp";
import { card } from "@/lib/ui";

export type StatTone = "neutral" | "success" | "danger" | "warning";

interface StatCardProps {
  label: string;
  value: number;
  format?: (value: number) => string;
  tone?: StatTone;
  caption?: string;
}

const DOT: Record<StatTone, string> = {
  neutral: "bg-border-strong",
  success: "bg-success",
  danger: "bg-danger",
  warning: "bg-warning",
};

export function StatCard({ label, value, format, tone = "neutral", caption }: StatCardProps) {
  const animated = useCountUp(value);
  const render = format ?? ((n: number) => formatNumber(Math.round(n)));

  return (
    <div className={`${card} p-4 transition-shadow duration-150 hover:shadow-soft`}>
      <p className="flex items-center gap-2 text-xs font-medium text-muted">
        <span className={`size-1.5 rounded-full ${DOT[tone]}`} aria-hidden />
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-fg">
        <span aria-hidden>{render(animated)}</span>
        <span className="sr-only">{render(value)}</span>
      </p>
      {caption && <p className="mt-1 text-xs text-subtle">{caption}</p>}
    </div>
  );
}
