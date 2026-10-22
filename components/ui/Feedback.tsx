"use client";

import type { ReactNode } from "react";
import { AlertCircle, RotateCw } from "lucide-react";
import type { ApiError } from "@/lib/api";
import { button } from "@/lib/ui";

/** Inline error with a retry action. */
export function ErrorBanner({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex gap-3 rounded-2xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm">
      <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-fg">{error.message}</p>
        {error.detail && <p className="mt-1 break-words text-muted">{error.detail}</p>}
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry} className={`${button.secondary} h-8 shrink-0 px-3`}>
          <RotateCw className="size-3.5" aria-hidden />
          Retry
        </button>
      )}
    </div>
  );
}

/** One sentence, optionally one action. */
export function EmptyState({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
      <p className="max-w-sm text-sm text-muted">{children}</p>
      {action}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`block animate-pulse rounded-md bg-surface-2 ${className}`} />;
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-fg lining-nums">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
