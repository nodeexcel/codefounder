export type FieldKey =
  | "fullName"
  | "username"
  | "email"
  | "password"
  | "confirmPassword";

const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function validateFullName(value: string): string | null {
  if (!value) return "Full name is required";

  if (value !== value.trim()) {
    return "Leading or trailing spaces are not allowed";
  }

  if (/\s{2,}/.test(value)) {
    return "Use only one space between names";
  }

  if (value.length < 2) return "Full name must be at least 2 characters";
  if (value.length > 50) return "Full name must be 50 characters or less";

  // Letters only, single spaces between words (e.g. "John Doe", "Muhammad Javed")
  if (!/^[a-zA-Z]+( [a-zA-Z]+)*$/.test(value)) {
    return "Only letters and single spaces between words are allowed";
  }

  return null;
}

export function validateUsername(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "Username is required";
  if (normalized.length < 3) return "Username must be at least 3 characters";
  if (normalized.length > 20) return "Username must be 20 characters or less";
  if (/\s/.test(value)) return "Username cannot contain spaces";
  if (!/^[a-z0-9_]+$/.test(normalized)) {
    return "Only lowercase letters, numbers, and underscores";
  }
  return null;
}

export function validateEmail(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Email is required";
  if (!EMAIL_REGEX.test(trimmed)) return "Enter a valid email address";
  return null;
}

export function validateSignupPassword(value: string): string | null {
  if (!value) return "Password is required";
  if (/\s/.test(value)) return "Password cannot contain spaces";
  if (value.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(value)) return "Include at least one uppercase letter";
  if (!/[a-z]/.test(value)) return "Include at least one lowercase letter";
  if (!/[0-9]/.test(value)) return "Include at least one number";
  if (!/[^A-Za-z0-9]/.test(value)) {
    return "Include at least one special character";
  }
  return null;
}

export function validateLoginPassword(value: string): string | null {
  if (!value) return "Password is required";
  if (/\s/.test(value)) return "Password cannot contain spaces";
  if (value.length < 8) return "Password must be at least 8 characters";
  return null;
}

export function validateConfirmPassword(
  password: string,
  confirmPassword: string
): string | null {
  if (!confirmPassword) return "Please confirm your password";
  if (confirmPassword !== password) return "Passwords do not match";
  return null;
}

export type PasswordStrength = 0 | 1 | 2 | 3 | 4;

export function getPasswordStrength(password: string): {
  score: PasswordStrength;
  label: string;
  checks: { label: string; met: boolean }[];
} {
  const checks = [
    { label: "8+ characters", met: password.length >= 8 },
    { label: "Uppercase letter", met: /[A-Z]/.test(password) },
    { label: "Lowercase letter", met: /[a-z]/.test(password) },
    { label: "Number", met: /[0-9]/.test(password) },
    { label: "Special character", met: /[^A-Za-z0-9]/.test(password) },
    { label: "No spaces", met: password.length > 0 && !/\s/.test(password) },
  ];

  const metCount = checks.filter((c) => c.met).length;
  const score = Math.min(4, Math.max(0, metCount - 1)) as PasswordStrength;

  const labels: Record<PasswordStrength, string> = {
    0: "Too weak",
    1: "Weak",
    2: "Fair",
    3: "Good",
    4: "Strong",
  };

  return { score, label: labels[score], checks };
}

export function isLoginFormValid(
  email: string,
  password: string
): boolean {
  return (
    validateEmail(email) === null && validateLoginPassword(password) === null
  );
}

export function isSignupFormValid(
  fullName: string,
  username: string,
  email: string,
  password: string,
  confirmPassword: string
): boolean {
  return (
    validateFullName(fullName) === null &&
    validateUsername(username) === null &&
    validateEmail(email) === null &&
    validateSignupPassword(password) === null &&
    validateConfirmPassword(password, confirmPassword) === null
  );
}
