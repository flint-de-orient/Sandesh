"use client";

import { useId, useState, type ReactNode } from "react";

/**
 * Hover/focus tooltip. Positioned `fixed` from the trigger's rect so it is never
 * clipped by scrolling table containers.
 */
export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  const show = (el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    setPosition({ x: rect.left + rect.width / 2, y: rect.top });
  };
  const hide = () => setPosition(null);

  return (
    <span
      tabIndex={0}
      aria-describedby={id}
      onMouseEnter={(e) => show(e.currentTarget)}
      onMouseLeave={hide}
      onFocus={(e) => show(e.currentTarget)}
      onBlur={hide}
      onKeyDown={(e) => e.key === "Escape" && hide()}
      onClick={(e) => e.stopPropagation()}
      className="inline-flex rounded-full"
    >
      {children}
      <span
        role="tooltip"
        id={id}
        hidden={!position}
        style={position ? { left: position.x, top: position.y } : undefined}
        className="pointer-events-none fixed z-50 w-max max-w-72 -translate-x-1/2 -translate-y-[calc(100%+8px)] rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-xs leading-snug text-fg shadow-soft"
      >
        {label}
      </span>
    </span>
  );
}
