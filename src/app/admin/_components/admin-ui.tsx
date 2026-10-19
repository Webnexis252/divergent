import type { ComponentType, ReactNode } from "react";
import { cx } from "@/lib/cx";

/**
 * Building blocks for admin and super admin pages, in the visual language of
 * the analytics dashboard: a quiet page header instead of a gradient banner,
 * white hairline-bordered panels, tinted icon chips and small status badges.
 * No hooks, so server and client pages can both use them.
 */

type IconType = ComponentType<{ className?: string; strokeWidth?: number }>;

export const ICON_TONES = {
  sky: "bg-[#e0f2fe] text-[#0284c7]",
  violet: "bg-[#ede9fe] text-[#6d28d9]",
  amber: "bg-[#fef3c7] text-[#b45309]",
  emerald: "bg-[#dcfce7] text-[#15803d]",
  rose: "bg-[#ffe4e6] text-[#be123c]",
  slate: "bg-[#f1f5f9] text-[#475569]",
} as const;

export type IconTone = keyof typeof ICON_TONES;

export function IconChip({
  icon: Icon,
  tone = "sky",
  size = "md",
  className,
}: {
  icon: IconType;
  tone?: IconTone;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      className={cx(
        "grid shrink-0 place-items-center",
        size === "sm" ? "h-8 w-8 rounded-[10px]" : "h-10 w-10 rounded-[12px]",
        ICON_TONES[tone],
        className,
      )}
    >
      <Icon className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} aria-hidden="true" />
    </span>
  );
}

// ─── Page header ──────────────────────────────────────────────────────────────

export function AdminPageHeader({
  eyebrow,
  icon: Icon,
  title,
  description,
  actions,
  className,
}: {
  eyebrow: string;
  icon?: IconType;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cx("flex flex-col gap-5 pt-2 lg:flex-row lg:items-end lg:justify-between", className)}>
      <div className="min-w-0">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#d7ecff] bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#209bd2]">
          {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
          {eyebrow}
        </span>
        <h1 className="mt-4 text-[32px] font-semibold leading-[1.1] tracking-[-0.04em] text-[#0f172a] sm:text-[40px]">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-[640px] text-[15px] leading-6 text-[#64748b]">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </header>
  );
}

// ─── Panels ───────────────────────────────────────────────────────────────────

export const adminPanelClass =
  "rounded-[24px] border border-[#e8edf3] bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]";

export function AdminPanel({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return <section className={cx(adminPanelClass, padded && "p-5 sm:p-6", className)}>{children}</section>;
}

export function AdminPanelHeader({
  icon,
  tone = "sky",
  title,
  description,
  actions,
  className,
}: {
  icon?: IconType;
  tone?: IconTone;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon ? <IconChip icon={icon} tone={tone} /> : null}
        <div className="min-w-0">
          <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-[#0f172a]">{title}</h2>
          {description ? <p className="mt-1 text-[13px] text-[#64748b]">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function AdminEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: IconType;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "flex flex-col items-center justify-center rounded-[16px] border border-dashed border-[#e2e8f0] px-6 py-14 text-center",
        className,
      )}
    >
      {Icon ? (
        <span className="grid h-11 w-11 place-items-center rounded-full border border-[#e2e8f0] bg-white text-[#64748b] shadow-[0_6px_16px_rgba(15,23,42,0.06)]">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      ) : null}
      <p className={cx("text-[14px] font-semibold text-[#334155]", Icon && "mt-3")}>{title}</p>
      {description ? <p className="mt-1 max-w-[48ch] text-[13px] text-[#64748b]">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

// ─── Badges ───────────────────────────────────────────────────────────────────

export const STATUS_TONES = {
  good: "bg-[#ecfdf3] text-[#15803d]",
  warning: "bg-[#fffbeb] text-[#b45309]",
  critical: "bg-[#fef2f2] text-[#b91c1c]",
  info: "bg-[#f0f9ff] text-[#0369a1]",
  violet: "bg-[#f5f3ff] text-[#6d28d9]",
  neutral: "bg-[#f1f5f9] text-[#475569]",
} as const;

export type StatusTone = keyof typeof STATUS_TONES;

export function StatusBadge({
  tone = "neutral",
  icon: Icon,
  children,
  className,
}: {
  tone?: StatusTone;
  icon?: IconType;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold",
        STATUS_TONES[tone],
        className,
      )}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

// ─── Buttons, inputs, tables ──────────────────────────────────────────────────

const buttonShared =
  "inline-flex shrink-0 items-center justify-center gap-2 font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#209bd2] disabled:cursor-not-allowed disabled:opacity-60";

const buttonVariants = {
  primary: "bg-[#0f172a] text-white shadow-[0_1px_2px_rgba(15,23,42,0.12)] hover:bg-[#1e293b]",
  secondary:
    "border border-[#e2e8f0] bg-white text-[#0f172a] shadow-[0_1px_2px_rgba(15,23,42,0.05)] hover:border-[#cbd5e1] hover:bg-[#f8fafc]",
  danger: "border border-[#fecaca] bg-white text-[#b91c1c] hover:bg-[#fef2f2]",
  destructive: "bg-[#b91c1c] text-white shadow-[0_1px_2px_rgba(127,29,29,0.2)] hover:bg-[#991b1b]",
  ghost: "text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a]",
} as const;

type ButtonVariant = keyof typeof buttonVariants;

function buttonSet(size: string) {
  return Object.fromEntries(
    Object.entries(buttonVariants).map(([variant, classes]) => [variant, `${buttonShared} ${size} ${classes}`]),
  ) as Record<ButtonVariant, string>;
}

export const adminButton = buttonSet("h-10 rounded-[12px] px-4 text-[13px]");
export const adminButtonSm = buttonSet("h-8 rounded-[10px] px-3 text-[12px]");

export const adminInputClass =
  "h-11 w-full rounded-[12px] border border-[#e2e8f0] bg-white px-3.5 text-[14px] text-[#0f172a] placeholder:text-[#94a3b8] transition-colors hover:border-[#cbd5e1] focus:border-[#209bd2] focus:outline-none focus:ring-3 focus:ring-[#38c1ff]/20";

export const adminTextareaClass =
  "w-full rounded-[12px] border border-[#e2e8f0] bg-white px-3.5 py-3 text-[14px] text-[#0f172a] placeholder:text-[#94a3b8] transition-colors hover:border-[#cbd5e1] focus:border-[#209bd2] focus:outline-none focus:ring-3 focus:ring-[#38c1ff]/20";

export const adminLabelClass = "mb-1.5 block text-[12px] font-semibold text-[#475569]";

/** A list row inside a panel: a quiet bordered card. */
export const adminRowClass =
  "rounded-[16px] border border-[#eef1f5] bg-white px-5 py-4 transition-colors hover:border-[#e2e8f0] hover:bg-[#fbfcfd]";

export const adminTable = {
  wrap: "overflow-x-auto",
  table: "w-full text-left text-[13px]",
  head: "bg-[#f8fafc] text-[11px] uppercase tracking-[0.08em] text-[#64748b]",
  th: "px-5 py-3 font-semibold whitespace-nowrap",
  row: "border-t border-[#f1f5f9] transition-colors hover:bg-[#fbfcfd]",
  td: "px-5 py-3.5 text-[#334155]",
} as const;

/** The toolbar row that holds search boxes and filters above a list. */
export const adminToolbarClass =
  "rounded-[20px] border border-[#e8edf3] bg-white/90 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)] backdrop-blur sm:p-5";

/** A row of headline figures between a panel's header and its chart. */
export function SummaryFigures({
  items,
  className,
}: {
  items: { label: string; value: ReactNode; detail?: ReactNode }[];
  className?: string;
}) {
  return (
    <dl
      className={cx(
        "mt-5 grid gap-4 border-y border-[#eef1f5] py-4 sm:gap-0 sm:divide-x sm:divide-[#eef1f5]",
        items.length === 2 ? "sm:grid-cols-2" : items.length >= 4 ? "sm:grid-cols-4" : "sm:grid-cols-3",
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="min-w-0 sm:px-5 sm:first:pl-0">
          <dt className="text-[12px] font-medium text-[#64748b]">{item.label}</dt>
          <dd className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[22px] font-semibold leading-none tracking-[-0.03em] text-[#0f172a]">{item.value}</span>
            {item.detail}
          </dd>
        </div>
      ))}
    </dl>
  );
}
