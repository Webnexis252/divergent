import Image from "next/image";
import Link from "next/link";
import { brand } from "@/lib/brand";
import { cx } from "@/lib/cx";

export function BrandLogo({
  href,
  priority,
  className,
  size = "md",
  inverted,
}: {
  href?: string;
  priority?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
  inverted?: boolean;
}) {
  const image = (
    <Image
      alt={brand.fullName}
      className={cx(
        "h-auto w-auto object-contain",
        inverted && "brightness-0 invert",
      )}
      height={size === "sm" ? 44 : size === "lg" ? 72 : 56}
      priority={priority}
      src={brand.logoSrc}
      width={size === "sm" ? 140 : size === "lg" ? 228 : 176}
    />
  );

  if (!href) {
    return <div className={className}>{image}</div>;
  }

  return (
    <Link className={className} href={href}>
      {image}
    </Link>
  );
}
