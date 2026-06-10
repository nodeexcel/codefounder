import { type InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, required, className = "", id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium"
            style={{ color: "var(--foreground)", fontFamily: "var(--font-sans)" }}
          >
            {label}
            {required && <span style={{ color: "var(--accent)", marginLeft: 2 }}>*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            "cf-input",
            error ? "!border-[var(--danger)] focus:!shadow-[0_0_0_3px_rgba(239,68,68,0.12)]" : "",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          {...props}
        />
        {error && (
          <p className="mt-1.5 flex items-center gap-1 text-xs" style={{ color: "var(--danger)" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </p>
        )}
        {hint && !error && (
          <p className="mt-1.5 text-xs" style={{ color: "var(--muted)" }}>{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
