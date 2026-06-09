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
        hover ? "hover:shadow-xl hover:shadow-[#E87B2C]/5 hover:-translate-y-0.5" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        background: "#1e1e1e",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {(hover || accent) && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[#E87B2C]/60 via-[#f59e0b]/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
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
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[3px] text-[#E87B2C] font-[Outfit]">
            {label}
          </p>
        )}
        <h3 className="font-[Outfit] text-lg font-semibold text-white">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-[#AAAAAA]">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
