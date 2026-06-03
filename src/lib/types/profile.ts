export interface Profile {
  id: string;
  username: string;
  full_name: string;
  email: string;
  created_at: string;
}

export function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function getFirstName(fullName: string): string {
  const first = fullName.trim().split(/\s+/)[0];
  return first || "there";
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase().replace(/\s+/g, "_");
}

export function isValidUsername(username: string): boolean {
  return /^[a-z0-9_]{3,30}$/.test(normalizeUsername(username));
}
