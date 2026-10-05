import { cx } from "@/lib/cx";

/**
 * The brand-blue banner that opens student dashboard pages (Home, Live
 * Classes, Tests…), so every page starts the same way instead of each copying
 * the gradient, radius, shadow and type sizes by hand.
 *
 * `eyebrow` sits above the title (a date, a section name); `aside` fills the
 * right-hand column on large screens and stacks below on small ones.
 */
export function PageHero({
  eyebrow,
  title,
  description,
  aside,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "relative overflow-hidden rounded-[24px] bg-[linear-gradient(145deg,var(--brand-primary)_0%,#00a7fa_100%)] px-5 py-6 text-white shadow-[0_12px_32px_rgba(56,193,255,0.25)] sm:px-10 sm:py-8",
        className,
      )}
    >
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
      <div
        className={cx(
          "relative z-10 grid items-center gap-6",
          Boolean(aside) && "lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] lg:gap-10",
        )}
      >
        <div className="max-w-[40rem]">
          {eyebrow && <div className="text-[14px] font-medium text-white/90 sm:text-[16px]">{eyebrow}</div>}
          <h1 className={cx("text-[2.1rem] font-bold leading-tight tracking-[-0.03em] sm:text-[clamp(2rem,4vw,3rem)]", Boolean(eyebrow) && "mt-3 sm:mt-4")}>
            {title}
          </h1>
          {description && (
            <div className="mt-2 text-[15px] leading-relaxed text-white/92 sm:text-[clamp(1.05rem,1.6vw,1.25rem)]">
              {description}
            </div>
          )}
        </div>
        {aside}
      </div>
    </div>
  );
}
