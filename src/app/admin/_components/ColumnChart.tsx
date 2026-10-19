"use client";

import { useState } from "react";
import { m as motion, useReducedMotion } from "motion/react";
import { niceTicks } from "@/lib/chart-scale";

export type ColumnDatum = {
  key: string;
  /** Short x-axis label ("Oct", "7 Oct"). */
  label: string;
  /** Tooltip heading ("October 2026", "Tue, 7 Oct"). */
  detail: string;
  value: number;
  /** A period that hasn't happened yet: drawn as an empty slot, not a zero. */
  pending?: boolean;
  /** Leave false to skip this x-axis label when the axis is crowded. */
  showLabel?: boolean;
};

/**
 * Single-series column chart: thin columns with rounded caps on a hairline
 * grid, round-number y ticks, and a tooltip on hover or keyboard focus.
 */
export function ColumnChart({
  data,
  formatValue,
  formatTick,
  unit,
  ariaLabel,
  height = 220,
}: {
  data: ColumnDatum[];
  formatValue: (value: number) => string;
  formatTick: (value: number) => string;
  unit?: string;
  ariaLabel: string;
  height?: number;
}) {
  const [active, setActive] = useState<number | null>(null);
  const reduceMotion = useReducedMotion();

  const ticks = niceTicks(Math.max(0, ...data.filter((d) => !d.pending).map((d) => d.value)));
  const top = ticks[ticks.length - 1];
  const n = data.length;
  const gap = n > 20 ? "gap-[2px] sm:gap-1" : "gap-1 sm:gap-2";
  const columns = { gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` };

  return (
    <div className="relative pl-12">
      <div className="pointer-events-none absolute inset-x-0 top-0" style={{ height }} aria-hidden="true">
        {ticks.map((t) => (
          <div
            key={t}
            className={`absolute inset-x-0 ml-12 border-t ${t === 0 ? "border-[#e2e8f0]" : "border-[#eef1f5]"}`}
            style={{ bottom: `${(t / top) * 100}%` }}
          >
            <span className="absolute -left-12 w-10 -translate-y-1/2 text-right text-[11px] font-medium tabular-nums text-[#94a3b8]">
              {formatTick(t)}
            </span>
          </div>
        ))}
      </div>

      <div className={`relative grid items-end ${gap}`} style={{ ...columns, height }} role="list" aria-label={ariaLabel}>
        {data.map((item, index) => {
          const pct = item.pending ? 0 : (item.value / top) * 100;
          const isActive = active === index;
          const tooltipAlign =
            index < 2 ? { left: 0 } : index > n - 3 ? { right: 0 } : { left: "50%", transform: "translateX(-50%)" };
          return (
            <div
              key={item.key}
              role="listitem"
              tabIndex={item.pending ? -1 : 0}
              aria-label={item.pending ? `${item.detail}: not yet` : `${item.detail}: ${formatValue(item.value)}${unit ? ` ${unit}` : ""}`}
              className="group relative flex h-full items-end justify-center rounded-[4px] outline-none focus-visible:bg-[#f0f9ff]"
              onMouseEnter={() => !item.pending && setActive(index)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => !item.pending && setActive(index)}
              onBlur={() => setActive(null)}
            >
              {item.pending ? (
                <span className="h-1 w-full max-w-[24px] rounded-full bg-[#f1f5f9]" />
              ) : (
                <motion.span
                  className={`block w-full max-w-[24px] rounded-t-[4px] transition-colors ${isActive ? "bg-[#1b77ff]" : "bg-[#209bd2]"}`}
                  initial={reduceMotion ? false : { height: 0 }}
                  animate={{ height: `${item.value > 0 ? Math.max(pct, 1.5) : 0}%` }}
                  transition={{ duration: 0.55, delay: Math.min(index * 0.02, 0.4), ease: [0.22, 1, 0.36, 1] }}
                />
              )}

              {isActive && (
                <div
                  className="pointer-events-none absolute z-10 min-w-[130px] whitespace-nowrap rounded-[12px] border border-[#e2e8f0] bg-white/95 px-3 py-2 text-left shadow-[0_14px_34px_rgba(15,23,42,0.14)] backdrop-blur"
                  style={{ bottom: `calc(${pct}% + 10px)`, ...tooltipAlign }}
                >
                  <p className="text-[11px] font-medium text-[#64748b]">{item.detail}</p>
                  <p className="mt-0.5 text-[15px] font-semibold text-[#0f172a]">
                    {formatValue(item.value)}
                    {unit ? <span className="ml-1 text-[12px] font-normal text-[#64748b]">{unit}</span> : null}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className={`mt-2 grid ${gap}`} style={columns} aria-hidden="true">
        {data.map((item) => (
          // A flex box centres a label that's wider than its column on both sides
          <span key={item.key} className="flex justify-center">
            <span
              className={`whitespace-nowrap text-[10px] font-medium sm:text-[11px] ${
                item.pending ? "text-[#cbd5e1]" : "text-[#64748b]"
              }`}
            >
              {item.showLabel === false ? "" : item.label}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
