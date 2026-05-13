import { cx } from "@/lib/cx";

type BadgeTone = "brand" | "brandStrong" | "success" | "warning" | "danger" | "neutral";

const toneClasses: Record<BadgeTone, string> = {
  brand: "bg-(--brand-primary-soft) text-(--brand-primary-dark)",
  brandStrong: "bg-(--brand-primary-strong) text-white",
  success: "bg-[rgba(76,175,80,0.14)] text-(--success)",
  warning: "bg-[rgba(245,158,11,0.14)] text-(--warning)",
  danger: "bg-[rgba(255,61,0,0.12)] text-(--danger)",
  neutral: "bg-black/[0.05] text-(--text-muted)",
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
