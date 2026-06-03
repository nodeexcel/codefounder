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
    <span className={`font-bold tracking-tight ${sizeMap[size]}`}>
      <span className="text-white">Code</span>
      <span className="text-[#f97316]">Founder</span>
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
