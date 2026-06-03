"use client";

import { getPasswordStrength } from "./validation";

interface PasswordStrengthIndicatorProps {
  password: string;
}

const STRENGTH_COLORS = [
  "bg-red-500",
  "bg-orange-500",
  "bg-yellow-500",
  "bg-lime-500",
  "bg-green-500",
];

export function PasswordStrengthIndicator({
  password,
}: PasswordStrengthIndicatorProps) {
  if (!password) return null;

  const { score, label, checks } = getPasswordStrength(password);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-1 gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={[
                "h-1 flex-1 rounded-full transition-colors duration-300",
                i <= score - 1 && score > 0
                  ? STRENGTH_COLORS[score]
                  : "bg-[#222222]",
              ].join(" ")}
            />
          ))}
        </div>
        <span
          className={[
            "text-xs font-medium",
            score <= 1
              ? "text-red-400"
              : score === 2
                ? "text-yellow-400"
                : "text-green-400",
          ].join(" ")}
        >
          {label}
        </span>
      </div>
      <ul className="grid grid-cols-2 gap-x-2 gap-y-1">
        {checks.map((check) => (
          <li
            key={check.label}
            className={[
              "flex items-center gap-1.5 text-xs",
              check.met ? "text-green-400/90" : "text-gray-500",
            ].join(" ")}
          >
            <span aria-hidden>{check.met ? "✓" : "○"}</span>
            {check.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
