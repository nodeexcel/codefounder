import { type ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  padding?: "sm" | "md" | "lg";
  accent?: boolean;
}

const paddingMap = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({
  children,
  className = "",
  hover = false,
  padding = "md",
  accent = false,
}: CardProps) {
  return (
    <div
      className={[
        "group relative overflow-hidden rounded-xl transition-all duration-300",
        paddingMap[padding],
        hover ? "hover:shadow-xl hover:-translate-y-0.5" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
      }}
    >
      {(hover || accent) && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: "linear-gradient(90deg, var(--accent)/60, var(--accent-light)/30, transparent)" }}
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
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        {label && (
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[3px] font-[Outfit]" style={{ color: "var(--accent)" }}>
            {label}
          </p>
        )}
        <h3 className="font-[Outfit] text-lg font-semibold" style={{ color: "var(--foreground)" }}>{title}</h3>
        {description && (
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
