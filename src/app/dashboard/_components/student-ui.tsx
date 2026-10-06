import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cx } from "@/lib/cx";
import { AnimCard, StaggerGrid } from "./motion-wrappers";

/**
 * The look shared by the redesigned student pages (Tests, Modules, Library,
 * matching Assignments and Doubts): page frame, white cards, brand pills and
 * buttons, and the "At a Glance" rail of stat cards.
 */

export const pageMain = "min-h-screen overflow-x-clip bg-[#f9fafb] pb-24 text-black sm:bg-[#f7f5f4] sm:pb-0";
export const pageSection =
  "mx-auto min-w-0 max-w-[1920px] space-y-6 px-4 py-5 sm:space-y-8 sm:px-6 sm:py-6 lg:px-[38px] lg:py-[18px] xl:pr-10";
// Main column plus the At a Glance rail on wide screens
export const pageColumns = "grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_293px] xl:items-start";

// Brand blue darkened just enough to pass AA as small text on white.
// globals.css sets `a { color: inherit }` outside any layer, so text colours that land on links are marked `!`
export const brandInk = "text-[color-mix(in_srgb,var(--brand-primary-strong)_72%,black)]!";
export const primaryAction =
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-[12px] bg-(--brand-primary-strong) px-5 text-[14px] font-semibold text-white! shadow-[0_4px_12px_rgba(32,155,210,0.28)] transition-[transform,filter,background-color] duration-150 hover:-translate-y-0.5 hover:brightness-95 active:translate-y-0";
export const secondaryAction = cx(
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-[12px] border border-[rgba(56,193,255,0.45)] bg-white px-4 text-[14px] font-semibold transition-colors duration-150 hover:bg-(--brand-primary-soft)",
  brandInk,
);
export const card = "overflow-hidden rounded-[20px] bg-white shadow-[0_4px_20px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.04]";
// The white card in a PageHero's aside
export const heroCard = "rounded-[20px] bg-white p-5 text-black shadow-[0_12px_30px_rgba(8,80,130,0.18)] sm:p-6";
export const sectionTitle = "text-[clamp(1.5rem,2.6vw,1.85rem)] font-semibold tracking-[-0.02em] text-black";
export const sectionLede = "mt-1 text-[14px] text-black/55";
export const pill = "inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold";

export const pillTone = {
  brand: cx("bg-(--brand-primary-soft)", brandInk),
  good: "bg-[rgba(76,175,80,0.14)] text-[#2e6b31]",
  warn: "bg-[rgba(254,198,0,0.2)] text-[#6b4c00]",
  neutral: "bg-black/[0.05] text-black/60",
} as const;

export function CoursePill({ title }: { title: string }) {
  return <span className={cx(pill, "truncate", pillTone.brand)}>{title}</span>;
}

/** Heading for a list inside a section, e.g. "To take 3" */
export function ListHeading({ id, label, count }: { id: string; label: string; count: number }) {
  return (
    <h3 id={id} className="text-[15px] font-bold text-black">
      {label} <span className="font-semibold text-black/40">{count}</span>
    </h3>
  );
}

/** A course's title over a one-line summary, with a link to the course */
export function CourseHeading({ title, summary, slug }: { title: string; summary: string; slug: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        <h2 className={sectionTitle}>{title}</h2>
        <p className={cx(sectionLede, "tabular-nums")}>{summary}</p>
      </div>
      <Link
        href={`/dashboard/courses/${slug}`}
        className={cx("inline-flex items-center gap-1.5 text-[14px] font-semibold", brandInk)}
      >
        Open course
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </Link>
    </div>
  );
}

/** A full-width white card with artwork, for empty pages and "all caught up" states */
export function ArtCard({
  image,
  title,
  description,
  action,
}: {
  image: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={cx(card, "flex flex-col items-center px-6 py-12 text-center")}>
      <Image alt="" className="h-28 w-28 scale-[1.3] object-contain" height={224} src={image} width={224} />
      <p className="mt-4 text-[18px] font-bold text-black">{title}</p>
      <p className="mt-1.5 max-w-[44ch] text-[14px] leading-relaxed text-black/55">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function StatCard({ image, label, value, note }: { image: string; label: string; value: string; note: string }) {
  return (
    <AnimCard className="min-w-[220px] flex-1 snap-start sm:min-w-0">
      <div className="flex items-center gap-4 rounded-[24px] bg-white p-3 pr-5 shadow-[0_4px_20px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.04]">
        <div className="grid h-[76px] w-[76px] shrink-0 place-items-center overflow-hidden rounded-[18px] bg-[#f4f2ff]">
          <Image alt="" className="h-[76px] w-[76px] scale-[1.35] object-contain" height={152} src={image} width={152} />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-black/55">{label}</p>
          <p className="mt-1 text-[2rem] font-bold leading-none tracking-[-0.03em] tabular-nums text-black">{value}</p>
          <p className="mt-1 truncate text-[12px] text-black/45">{note}</p>
        </div>
      </div>
    </AnimCard>
  );
}

/** The "At a Glance" rail: a sticky column on wide screens, a swipeable row above the content on phones */
export function GlanceRail({ lede, children }: { lede: string; children: React.ReactNode }) {
  return (
    <aside
      aria-labelledby="glance-heading"
      className="order-first min-w-0 space-y-4 xl:sticky xl:top-[calc(var(--app-header-height)+1.5rem)] xl:order-none"
    >
      <div className="sr-only xl:not-sr-only">
        <h2 id="glance-heading" className={sectionTitle}>
          At a Glance
        </h2>
        <p className={sectionLede}>{lede}</p>
      </div>
      <StaggerGrid className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-1">
        {children}
      </StaggerGrid>
    </aside>
  );
}
