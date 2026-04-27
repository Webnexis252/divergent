import { cx } from "@/lib/cx";

type BadgeTone = "brand" | "brandStrong" | "success" | "warning" | "danger" | "neutral";

const toneClasses: Record<BadgeTone, string> = {
  brand: "bg-[var(--brand-primary-soft)] text-[var(--brand-primary-dark)]",
  brandStrong: "bg-[var(--brand-primary-strong)] text-white",
  success: "bg-[rgba(76,175,80,0.14)] text-[var(--success)]",
  warning: "bg-[rgba(245,158,11,0.14)] text-[var(--warning)]",
  danger: "bg-[rgba(255,61,0,0.12)] text-[var(--danger)]",
  neutral: "bg-black/[0.05] text-[var(--text-muted)]",
};

export function Badge({
  children,
  className,
  tone = "neutral",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: BadgeTone;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
