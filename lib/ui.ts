// Sizing is left to the call site (h-10 px-4 by default, h-8 px-3 in dense bars).
const buttonBase =
  "inline-flex items-center justify-center gap-2 text-sm font-medium whitespace-nowrap transition-[background-color,border-color,box-shadow,color,filter] duration-150 disabled:cursor-not-allowed disabled:opacity-50";

/** Pill buttons, as on flintdeorient.in. Gold gradient is reserved for the primary action. */
export const button = {
  primary: `${buttonBase} rounded-full bg-gold font-semibold text-on-accent hover:shadow-glow hover:brightness-110 disabled:hover:shadow-none disabled:hover:brightness-100`,
  secondary: `${buttonBase} rounded-full border border-border bg-surface text-fg hover:border-accent/50 hover:text-accent-text disabled:hover:border-border disabled:hover:text-fg`,
  ghost: `${buttonBase} rounded-full text-muted hover:bg-surface-2 hover:text-fg`,
};

export const card = "rounded-2xl border border-border bg-surface";
