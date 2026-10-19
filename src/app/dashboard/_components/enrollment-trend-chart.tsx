"use client";

import { m as motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent, ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, ChartLine, Inbox, Minus, Table2 } from "lucide-react";
import { niceTicks } from "@/lib/chart-scale";
import { SegmentedControl } from "./segmented-control";

export type TrendPoint = { date: string; label: string; value: number };

// --primary-strong-blue: the lighter brand blue is only 2:1 on white, too faint for a data line
const LINE = "#209bd2";
const WASH = "#38c1ff";
const GRID = "#eef1f5";
const BASELINE = "#e2e8f0";

const PLOT_HEIGHT = 280;
const PAD = { top: 18, right: 16, bottom: 46, left: 44 };

const whole = new Intl.NumberFormat("en-IN");
const compact = new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 });
const weekdayFmt = new Intl.DateTimeFormat("en-IN", { weekday: "short", timeZone: "UTC" });
const dayMonthFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
const longDateFmt = new Intl.DateTimeFormat("en-IN", {
  weekday: "long",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** `date` is a UTC day (YYYY-MM-DD), so every format above pins timeZone to UTC. */
function toDate(point: TrendPoint) {
  return new Date(`${point.date}T00:00:00Z`);
}

function plural(n: number) {
  return n === 1 ? "enrollment" : "enrollments";
}

/**
 * Smooth path through the points that never overshoots them (monotone cubic,
 * Fritsch–Carlson), so a curve between two zero days stays on the baseline.
 */
function monotonePath(points: { x: number; y: number }[]): string {
  const n = points.length;
  if (n === 0) return "";
  const r = (v: number) => Math.round(v * 10) / 10;
  if (n === 1) return `M${r(points[0].x)},${r(points[0].y)}`;

  const dx: number[] = [];
  const slopes: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(points[i + 1].x - points[i].x);
    slopes.push((points[i + 1].y - points[i].y) / dx[i]);
  }

  const tangents = new Array<number>(n);
  tangents[0] = slopes[0];
  tangents[n - 1] = slopes[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (slopes[i - 1] * slopes[i] <= 0) {
      tangents[i] = 0;
    } else {
      const w1 = 2 * dx[i] + dx[i - 1];
      const w2 = dx[i] + 2 * dx[i - 1];
      tangents[i] = (w1 + w2) / (w1 / slopes[i - 1] + w2 / slopes[i]);
    }
  }

  let d = `M${r(points[0].x)},${r(points[0].y)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    const a = points[i];
    const b = points[i + 1];
    d += ` C${r(a.x + h)},${r(a.y + tangents[i] * h)} ${r(b.x - h)},${r(b.y - tangents[i + 1] * h)} ${r(b.x)},${r(b.y)}`;
  }
  return d;
}

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // ResizeObserver reports the initial size as soon as it starts observing
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}

// ─── Plot ─────────────────────────────────────────────────────────────────────

function TrendPlot({ data, total, days }: { data: TrendPoint[]; total: number; days: number }) {
  const [wrapRef, width] = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const reduceMotion = useReducedMotion();
  const gradientId = `enroll-wash-${useId().replace(/:/g, "")}`;

  const n = data.length;
  const empty = total === 0;
  const ticks = niceTicks(Math.max(0, ...data.map((d) => d.value)));
  const yMax = ticks[ticks.length - 1];

  const plotW = Math.max(width - PAD.left - PAD.right, 0);
  const baseY = PLOT_HEIGHT - PAD.bottom;
  const plotH = baseY - PAD.top;
  // Keep the first and last points clear of the card edge so their labels fit
  const inset = n <= 14 ? 22 : 8;
  const stepX = n > 1 ? (plotW - 2 * inset) / (n - 1) : 0;
  const xAt = (i: number) => (n > 1 ? PAD.left + inset + i * stepX : PAD.left + plotW / 2);
  const yAt = (v: number) => baseY - (v / yMax) * plotH;

  const points = data.map((d, i) => ({ x: xAt(i), y: yAt(d.value) }));
  const linePath = monotonePath(points);
  const areaPath =
    n > 1 ? `${linePath} L${points[n - 1].x},${baseY} L${points[0].x},${baseY} Z` : "";

  const twoLineLabels = n <= 14 && (n <= 1 || stepX >= 44);
  const labelEvery = twoLineLabels ? 1 : Math.max(1, Math.ceil(n / Math.max(2, Math.floor(plotW / 58))));
  const showDots = !empty && n <= 14;

  // Replay the draw-in animation only when the series itself changes, not on resize
  const signature = useMemo(() => data.map((d) => `${d.date}:${d.value}`).join("|"), [data]);

  function indexFromPointer(e: PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (n <= 1) return 0;
    return Math.min(n - 1, Math.max(0, Math.round((x - PAD.left - inset) / stepX)));
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, (i: number) => number> = {
      ArrowLeft: (i) => Math.max(0, i - 1),
      ArrowRight: (i) => Math.min(n - 1, i + 1),
      Home: () => 0,
      End: () => n - 1,
    };
    const move = moves[e.key];
    if (!move || n === 0) return;
    e.preventDefault();
    setActive((i) => move(i ?? n - 1));
  }

  const activePoint = active !== null ? data[active] : null;
  const activeX = active !== null ? xAt(active) : 0;
  const tooltipOnLeft = activeX > width - 190;

  return (
    <div
      ref={wrapRef}
      className="relative mt-5 rounded-[14px] outline-none focus-visible:ring-2 focus-visible:ring-[#209bd2]/40"
      style={{ height: PLOT_HEIGHT }}
      tabIndex={0}
      role="group"
      aria-label={`Enrollment trend chart: ${whole.format(total)} new ${plural(total)} over the last ${days} days. Use the arrow keys to read each day.`}
      onKeyDown={onKeyDown}
      onFocus={() => setActive((i) => i ?? n - 1)}
      onBlur={() => setActive(null)}
    >
      {width > 0 && (
        <svg
          width={width}
          height={PLOT_HEIGHT}
          className="block touch-pan-y select-none"
          aria-hidden="true"
          onPointerMove={(e) => setActive(indexFromPointer(e))}
          onPointerDown={(e) => setActive(indexFromPointer(e))}
          onPointerLeave={() => setActive(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={WASH} stopOpacity="0.22" />
              <stop offset="100%" stopColor={WASH} stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Gridlines + y-axis */}
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={yAt(t)}
                y2={yAt(t)}
                stroke={t === 0 ? BASELINE : GRID}
                shapeRendering="crispEdges"
              />
              <text
                x={PAD.left - 12}
                y={yAt(t)}
                dy="0.32em"
                textAnchor="end"
                className="fill-[#94a3b8] text-[11px] font-medium tabular-nums"
              >
                {compact.format(t)}
              </text>
            </g>
          ))}

          {/* X-axis labels, anchored on the latest day so "today" is always labelled */}
          {data.map((d, i) => {
            if ((n - 1 - i) % labelEvery !== 0) return null;
            const date = toDate(d);
            const isActive = i === active;
            return (
              <text
                key={d.date}
                x={xAt(i)}
                y={baseY + 20}
                textAnchor="middle"
                className={`text-[11px] tabular-nums ${isActive ? "fill-[#0f172a]" : "fill-[#64748b]"}`}
              >
                {twoLineLabels ? (
                  <>
                    <tspan x={xAt(i)} className="font-semibold">
                      {weekdayFmt.format(date)}
                    </tspan>
                    <tspan x={xAt(i)} dy="15" className={isActive ? "fill-[#475569]" : "fill-[#94a3b8]"}>
                      {dayMonthFmt.format(date)}
                    </tspan>
                  </>
                ) : (
                  <tspan className="font-medium">{dayMonthFmt.format(date)}</tspan>
                )}
              </text>
            );
          })}

          {/* Crosshair */}
          {active !== null && (
            <line
              x1={activeX}
              x2={activeX}
              y1={PAD.top - 6}
              y2={baseY}
              stroke="#cbd5e1"
              shapeRendering="crispEdges"
            />
          )}

          {n > 1 && (
            <>
              {!empty && (
                <motion.path
                  key={`area-${signature}`}
                  d={areaPath}
                  fill={`url(#${gradientId})`}
                  initial={reduceMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.25 }}
                />
              )}
              <motion.path
                key={`line-${signature}`}
                d={linePath}
                fill="none"
                stroke={empty ? "#cbd5e1" : LINE}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={reduceMotion ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              />
            </>
          )}

          {/* Daily markers on short ranges; otherwise just the latest point */}
          {!empty &&
            points.map((p, i) =>
              showDots || i === n - 1 ? (
                <circle key={data[i].date} cx={p.x} cy={p.y} r={4} fill={LINE} stroke="#ffffff" strokeWidth={2} />
              ) : null,
            )}

          {/* Active point */}
          {activePoint && active !== null && (
            <g pointerEvents="none">
              <circle cx={activeX} cy={yAt(activePoint.value)} r={11} fill={empty ? "#94a3b8" : LINE} opacity={0.14} />
              <circle
                cx={activeX}
                cy={yAt(activePoint.value)}
                r={5.5}
                fill={empty ? "#94a3b8" : LINE}
                stroke="#ffffff"
                strokeWidth={2.5}
              />
            </g>
          )}
        </svg>
      )}

      {empty && (
        <div className="pointer-events-none absolute inset-x-0 top-[22%] flex flex-col items-center px-6 text-center">
          <span className="grid h-11 w-11 place-items-center rounded-full border border-[#e2e8f0] bg-white text-[#64748b] shadow-[0_6px_16px_rgba(15,23,42,0.06)]">
            <Inbox className="h-5 w-5" />
          </span>
          <p className="mt-3 text-[14px] font-semibold text-[#334155]">No new enrollments in this period</p>
          <p className="mt-1 text-[12px] text-[#64748b]">Try a longer time range, or clear the course and batch filters.</p>
        </div>
      )}

      {activePoint && (
        <div
          className="pointer-events-none absolute top-0 z-10 min-w-[150px] rounded-[12px] border border-[#e2e8f0] bg-white/95 px-3.5 py-2.5 shadow-[0_14px_34px_rgba(15,23,42,0.14)] backdrop-blur"
          style={tooltipOnLeft ? { right: width - activeX + 12 } : { left: activeX + 12 }}
        >
          <p className="text-[11px] font-medium text-[#64748b]">{longDateFmt.format(toDate(activePoint))}</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="h-[2px] w-3 shrink-0 translate-y-[-3px] rounded-full" style={{ background: LINE }} />
            <span className="text-[16px] font-semibold text-[#0f172a]">{whole.format(activePoint.value)}</span>
            <span className="text-[12px] text-[#64748b]">new {plural(activePoint.value)}</span>
          </div>
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {activePoint
          ? `${longDateFmt.format(toDate(activePoint))}: ${activePoint.value} new ${plural(activePoint.value)}`
          : ""}
      </p>
    </div>
  );
}

// ─── Table view ───────────────────────────────────────────────────────────────

function TrendTable({ data }: { data: TrendPoint[] }) {
  return (
    <div className="mt-5 overflow-y-auto rounded-[14px] border border-[#eef1f5]" style={{ height: PLOT_HEIGHT }}>
      <table className="w-full text-left text-[13px]">
        <caption className="sr-only">New enrollments per day</caption>
        <thead className="sticky top-0 bg-[#f8fafc] text-[11px] uppercase tracking-[0.08em] text-[#64748b]">
          <tr>
            <th scope="col" className="px-4 py-2.5 font-semibold">Date</th>
            <th scope="col" className="px-4 py-2.5 text-right font-semibold">New enrollments</th>
          </tr>
        </thead>
        <tbody>
          {[...data].reverse().map((d) => (
            <tr key={d.date} className="border-t border-[#f1f5f9]">
              <td className="px-4 py-2.5 text-[#334155]">{longDateFmt.format(toDate(d))}</td>
              <td className={`px-4 py-2.5 text-right font-semibold tabular-nums ${d.value ? "text-[#0f172a]" : "text-[#94a3b8]"}`}>
                {whole.format(d.value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function ChangeBadge({ total, previousTotal, days }: { total: number; previousTotal: number; days: number }) {
  const diff = total - previousTotal;
  let text: string;
  if (diff === 0) text = "No change";
  else if (previousTotal === 0) text = `+${whole.format(diff)}`;
  else text = `${diff > 0 ? "+" : ""}${Math.round((diff / previousTotal) * 100)}%`;

  const tone =
    diff > 0
      ? "bg-[#ecfdf3] text-[#15803d]"
      : diff < 0
        ? "bg-[#fef2f2] text-[#b91c1c]"
        : "bg-[#f1f5f9] text-[#475569]";
  const Icon = diff > 0 ? ArrowUpRight : diff < 0 ? ArrowDownRight : Minus;

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}
      title={`${whole.format(previousTotal)} in the previous ${days} days`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {text}
      <span className="sr-only"> compared with the previous {days} days</span>
    </span>
  );
}

function SummaryFigure({ label, value, detail }: { label: string; value: string; detail?: ReactNode }) {
  return (
    <div className="min-w-0 sm:px-5 sm:first:pl-0">
      <dt className="text-[12px] font-medium text-[#64748b]">{label}</dt>
      <dd className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-[22px] font-semibold leading-none tracking-[-0.03em] text-[#0f172a]">{value}</span>
        {detail}
      </dd>
    </div>
  );
}

export function EnrollmentTrendChart({
  data,
  days,
  previousTotal,
}: {
  data: TrendPoint[];
  days: number;
  previousTotal?: number;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const average = data.length ? total / data.length : 0;
  const peak = total > 0 ? data.reduce((best, d) => (d.value > best.value ? d : best), data[0]) : null;

  return (
    <section className="h-full rounded-[24px] border border-[#e8edf3] bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-[#0f172a]">Enrollment trend</h2>
          <p className="mt-1 text-[13px] text-[#64748b]">New enrollments per day · last {days} days</p>
        </div>
        <SegmentedControl
          size="sm"
          ariaLabel="Chart view"
          value={view}
          onChange={setView}
          options={[
            { id: "chart", label: <><ChartLine className="h-3.5 w-3.5" aria-hidden="true" />Chart</> },
            { id: "table", label: <><Table2 className="h-3.5 w-3.5" aria-hidden="true" />Table</> },
          ]}
        />
      </div>

      <dl className="mt-5 grid gap-4 border-y border-[#eef1f5] py-4 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-[#eef1f5]">
        <SummaryFigure
          label="Total enrollments"
          value={whole.format(total)}
          detail={
            previousTotal !== undefined ? (
              <ChangeBadge total={total} previousTotal={previousTotal} days={days} />
            ) : undefined
          }
        />
        <SummaryFigure
          label="Daily average"
          value={average >= 10 ? compact.format(Math.round(average)) : average.toFixed(1)}
        />
        <SummaryFigure
          label="Busiest day"
          value={peak ? whole.format(peak.value) : "—"}
          detail={
            <span className="text-[12px] text-[#64748b]">
              {peak ? `${weekdayFmt.format(toDate(peak))}, ${dayMonthFmt.format(toDate(peak))}` : "No enrollments yet"}
            </span>
          }
        />
      </dl>

      {view === "chart" ? <TrendPlot data={data} total={total} days={days} /> : <TrendTable data={data} />}
    </section>
  );
}
