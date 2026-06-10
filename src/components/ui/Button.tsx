import Link from "next/link";
import { type ButtonHTMLAttributes, type ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type Size = "xs" | "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  href?: string;
  fullWidth?: boolean;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "relative overflow-hidden bg-[var(--accent)] text-white font-semibold shadow-md shadow-[var(--accent)]/20 " +
    "hover:bg-[var(--accent-hover)] hover:shadow-lg hover:shadow-[var(--accent)]/30 hover:-translate-y-px " +
    "active:translate-y-0 active:shadow-sm " +
    "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/[0.10] before:to-transparent before:-translate-x-full hover:before:translate-x-full before:transition-transform before:duration-500",
  secondary:
    "bg-[var(--card)] text-[var(--foreground)] border border-[var(--border2)] font-medium " +
    "hover:border-[var(--accent)]/40 hover:text-[var(--accent)] hover:bg-[var(--card-elevated)] " +
    "shadow-[var(--shadow-sm)]",
  ghost:
    "bg-transparent text-[var(--muted)] font-medium " +
    "hover:text-[var(--foreground)] hover:bg-[var(--surface2)]",
  outline:
    "bg-transparent text-[var(--foreground)] border border-[var(--border2)] font-medium " +
    "hover:border-[var(--accent)]/50 hover:text-[var(--accent)] hover:bg-[var(--accent-glow)]",
  danger:
    "bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger)]/20 font-medium " +
    "hover:bg-[var(--danger)]/15 hover:border-[var(--danger)]/40",
};

const sizes: Record<Size, string> = {
  xs: "h-7  px-2.5 text-xs  gap-1.5 rounded-md",
  sm: "h-8  px-3   text-sm  gap-1.5 rounded-lg",
  md: "h-9  px-4   text-sm  gap-2   rounded-lg",
  lg: "h-11 px-5   text-base gap-2  rounded-xl",
};

export function Button({
  variant = "primary",
  size = "md",
  children,
  href,
  fullWidth,
  loading,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const classes = [
    "inline-flex items-center justify-center font-[var(--font-sans)] transition-all duration-200 cursor-pointer select-none",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--background)]",
    "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
    variants[variant],
    sizes[size],
    fullWidth ? "w-full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const inner = loading ? (
    <>
      <svg
        className="animate-spin shrink-0"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      >
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
      <span>{children}</span>
    </>
  ) : (
    children
  );

  if (href && !isDisabled) {
    return (
      <Link href={href} className={classes}>
        {inner}
      </Link>
    );
  }

  return (
    <button className={classes} disabled={isDisabled} {...props}>
      {inner}
    </button>
  );
}
