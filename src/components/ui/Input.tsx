import { type InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = "", id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium"
            style={{ color: "var(--muted)" }}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            "w-full rounded-lg border px-4 py-2.5 placeholder:text-[var(--muted-low)]",
            "transition-all duration-200 outline-none",
            "focus:border-[var(--accent)]/60 focus:ring-1 focus:ring-[var(--accent)]/30",
            error ? "border-red-500 focus:border-red-500 focus:ring-red-500/30" : "",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          style={{
            background: "var(--card2)",
            borderColor: error ? undefined : "var(--border2)",
            color: "var(--foreground)",
          }}
          {...props}
        />
        {error && <p className="mt-1.5 text-sm text-red-400">{error}</p>}
        {hint && !error && (
          <p className="mt-1.5 text-sm" style={{ color: "var(--muted-low)" }}>{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
