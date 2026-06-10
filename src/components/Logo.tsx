import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  href?: string;
  size?: "xs" | "sm" | "md" | "lg";
  markOnly?: boolean;
}

const sizeMap = {
  xs: { mark: 20, text: "text-base",  gap: "gap-2"   },
  sm: { mark: 26, text: "text-lg",    gap: "gap-2.5" },
  md: { mark: 32, text: "text-xl",    gap: "gap-3"   },
  lg: { mark: 40, text: "text-2xl",   gap: "gap-3.5" },
};

export function Logo({ href = "/", size = "md", markOnly = false }: LogoProps) {
  const { mark, text, gap } = sizeMap[size];

  const content = (
    <span className={`inline-flex items-center ${gap}`}>
      <Image
        src="/Brandmark.png"
        alt="CodeFounder"
        width={mark}
        height={mark}
        className="shrink-0 object-contain"
        priority
      />
      {!markOnly && (
        <span
          className={`font-heading font-bold tracking-tight ${text}`}
          style={{ letterSpacing: "-0.025em" }}
        >
          <span style={{ color: "var(--foreground)" }}>Code</span>
          <span style={{ color: "var(--accent)" }}>Founder</span>
        </span>
      )}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center" aria-label="CodeFounder home">
        {content}
      </Link>
    );
  }

  return content;
}
