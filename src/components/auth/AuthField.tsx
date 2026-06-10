"use client";

import { useState, type InputHTMLAttributes } from "react";

interface AuthFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "className"> {
  label: string;
  error?: string | null;
  valid?: boolean;
  touched?: boolean;
  hint?: string;
  showPasswordToggle?: boolean;
}

export function AuthField({
  label,
  error,
  valid = false,
  touched = false,
  hint,
  showPasswordToggle = false,
  type = "text",
  id,
  ...props
}: AuthFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  const isPassword = type === "password" || showPasswordToggle;
  const inputType = isPassword && showPassword ? "text" : type;

  const borderColor =
    touched && error
      ? "rgba(239,68,68,0.5)"
      : touched && valid
        ? "rgba(34,197,94,0.45)"
        : "var(--border2)";

  const focusShadow =
    touched && error
      ? "0 0 0 3px rgba(239,68,68,0.12)"
      : touched && valid
        ? "0 0 0 3px rgba(34,197,94,0.1)"
        : "0 0 0 3px rgba(255,122,26,0.14)";

  return (
    <div style={{ width: "100%" }}>
      <label
        htmlFor={inputId}
        style={{
          display: "block",
          marginBottom: "6px",
          fontSize: "13px",
          fontWeight: 500,
          color: "var(--muted)",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          id={inputId}
          type={inputType}
          aria-invalid={touched && !!error}
          aria-describedby={
            error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
          }
          style={{
            width: "100%",
            background: "var(--card2)",
            border: `1px solid ${borderColor}`,
            borderRadius: "10px",
            color: "var(--foreground)",
            padding: showPasswordToggle ? "12px 44px 12px 16px" : "12px 16px",
            fontSize: "14px",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            outline: "none",
            transition: "border-color 0.2s, box-shadow 0.2s",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = touched && error
              ? "rgba(239,68,68,0.6)"
              : touched && valid
                ? "rgba(34,197,94,0.55)"
                : "rgba(255,122,26,0.6)";
            e.currentTarget.style.boxShadow = focusShadow;
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = borderColor;
            e.currentTarget.style.boxShadow = "none";
            props.onBlur?.(e);
          }}
          {...props}
        />
        {showPasswordToggle && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((v) => !v)}
            style={{
              position: "absolute",
              right: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--muted-low)",
              padding: "2px",
              display: "flex",
              alignItems: "center",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--muted)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--muted-low)"; }}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
      </div>
      {touched && error && (
        <p
          id={`${inputId}-error`}
          style={{ marginTop: "6px", fontSize: "12px", color: "#f87171", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          {error}
        </p>
      )}
      {hint && !error && (
        <p
          id={`${inputId}-hint`}
          style={{ marginTop: "6px", fontSize: "12px", color: "var(--muted-low)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

function EyeIcon() {
  return (
    <svg
      width="18"
      height="18"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="18"
      height="18"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
      />
    </svg>
  );
}
