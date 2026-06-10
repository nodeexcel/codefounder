import Link from "next/link";
import { type ButtonHTMLAttributes, type ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  href?: string;
  fullWidth?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "relative overflow-hidden bg-[var(--accent)] text-white hover:bg-[var(--accent-dark)] shadow-lg shadow-[var(--accent)]/25 hover:shadow-[var(--accent)]/40 hover:shadow-xl before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/[0.12] before:to-transparent before:-translate-x-full hover:before:translate-x-full before:transition-transform before:duration-500",
  secondary:
    "bg-[var(--card-elevated)] text-[var(--foreground)] hover:text-[var(--accent)] hover:border-[var(--accent)]/50",
  ghost: "bg-transparent text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface2)]",
  outline:
    "bg-transparent text-[var(--muted)] hover:text-[var(--accent)] hover:border-[var(--accent)]/50 hover:shadow-md hover:shadow-[var(--accent)]/10",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  children,
  href,
  fullWidth,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const hasBorder = variant === "secondary" || variant === "outline";

  const classes = [
    "inline-flex items-center justify-center gap-2 rounded-lg font-[Outfit] font-medium transition-all duration-200",
    "focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:ring-offset-2 focus:ring-offset-[var(--card2)]",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    hasBorder ? "border border-white/[0.08]" : "",
    variants[variant],
    sizes[size],
    fullWidth ? "w-full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} disabled={disabled} {...props}>
      {children}
    </button>
  );
}
