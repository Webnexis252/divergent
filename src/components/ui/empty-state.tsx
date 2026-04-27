import { cx } from "@/lib/cx";
import { Surface } from "./surface";

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <Surface
      className={cx(
        "flex flex-col items-center justify-center gap-4 px-8 py-14 text-center",
        className,
      )}
      tone="muted"
    >
      {icon ? (
        <div className="grid h-14 w-14 place-items-center rounded-full bg-white text-[var(--brand-primary-strong)] shadow-[var(--shadow-soft)]">
          {icon}
        </div>
      ) : null}
      <div className="space-y-2">
        <h3 className="text-xl font-semibold tracking-[-0.04em] text-[var(--text-strong)]">
          {title}
        </h3>
        <p className="max-w-[48ch] text-[14px] leading-6 text-[var(--text-muted)]">
          {description}
        </p>
      </div>
      {action ? <div className="pt-2">{action}</div> : null}
    </Surface>
  );
}
