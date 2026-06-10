import Link from "next/link";

interface LogoProps {
  href?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-3xl",
};

export function Logo({ href = "/", size = "md" }: LogoProps) {
  const content = (
    <span className={`font-bold tracking-tight ${sizeMap[size]}`} style={{ fontFamily: "Outfit, sans-serif" }}>
      <span style={{ color: "var(--foreground)" }}>Code</span>
      <span style={{ color: "var(--primary)" }}>Founder</span>
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block">
        {content}
      </Link>
    );
  }

  return content;
}
