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
    "bg-[#f97316] text-white hover:bg-[#ea580c] shadow-lg shadow-orange-500/20",
  secondary:
    "bg-[#111111] text-white border border-[#222222] hover:border-[#f97316] hover:text-[#f97316]",
  ghost: "bg-transparent text-gray-300 hover:text-white hover:bg-white/5",
  outline:
    "bg-transparent border border-[#222222] text-gray-200 hover:border-[#f97316] hover:text-[#f97316]",
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
  const classes = [
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200",
    "focus:outline-none focus:ring-2 focus:ring-[#f97316]/50 focus:ring-offset-2 focus:ring-offset-black",
    "disabled:opacity-50 disabled:cursor-not-allowed",
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
