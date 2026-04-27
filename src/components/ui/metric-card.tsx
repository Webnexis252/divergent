import { cx } from "@/lib/cx";
import { Surface } from "./surface";

export function MetricCard({
  label,
  value,
  meta,
  icon,
  accent = "var(--brand-primary-strong)",
  className,
}: {
  label: string;
  value: React.ReactNode;
  meta?: string;
  icon?: React.ReactNode;
  accent?: string;
  className?: string;
}) {
  return (
    <Surface
      className={cx(
        "group flex min-h-[176px] flex-col justify-between gap-8 px-5 py-5 sm:px-6 sm:py-6",
        className,
      )}
      tone="panel"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--text-subtle)]">
            {label}
          </p>
          <div
            className="mt-4 text-[clamp(2rem,4vw,3rem)] font-semibold leading-none tracking-[-0.08em]"
            style={{ color: accent }}
          >
            {value}
          </div>
        </div>
        {icon ? (
          <div
            className="grid h-12 w-12 place-items-center rounded-[var(--radius-md)] bg-white/90 text-[var(--text-strong)] shadow-[var(--shadow-soft)]"
            style={{ color: accent }}
          >
            {icon}
          </div>
        ) : null}
      </div>
      {meta ? (
        <p className="max-w-[26ch] text-[13px] leading-6 text-[var(--text-muted)]">
          {meta}
        </p>
      ) : null}
    </Surface>
  );
}
