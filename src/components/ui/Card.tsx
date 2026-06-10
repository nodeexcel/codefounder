import { type ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  accent?: boolean;
  style?: React.CSSProperties;
}

const paddingMap = { none: "", sm: "p-4", md: "p-5 sm:p-6", lg: "p-6 sm:p-8" };

export function Card({ children, className = "", hover = false, padding = "md", accent = false, style }: CardProps) {
  return (
    <div
      className={[
        "cf-card relative overflow-hidden",
        paddingMap[padding],
        hover ? "group hover:border-[var(--border2)] cursor-default" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
    >
      {(hover || accent) && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[1px] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: "linear-gradient(90deg, var(--accent), var(--accent-light) 50%, transparent)" }}
        />
      )}
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  label?: string;
}

export function CardHeader({ title, description, action, label }: CardHeaderProps) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        {label && (
          <p
            className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.2em]"
            style={{ color: "var(--accent)", fontFamily: "var(--font-sans)" }}
          >
            {label}
          </p>
        )}
        <h3
          className="text-[18px] font-semibold leading-snug"
          style={{ color: "var(--foreground)", fontFamily: "var(--font-heading)", letterSpacing: "-0.015em" }}
        >
          {title}
        </h3>
        {description && (
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
