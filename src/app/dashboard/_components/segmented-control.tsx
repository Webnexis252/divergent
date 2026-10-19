"use client";

import type { ReactNode } from "react";

type SegmentedOption<T extends string> = {
  id: T;
  label: ReactNode;
  ariaLabel?: string;
};

/** A row of mutually exclusive toggle buttons (time ranges, chart/table views). */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  size = "md",
  className = "",
  ariaLabel,
}: {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (id: T) => void;
  size?: "sm" | "md";
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`inline-grid auto-cols-fr grid-flow-col gap-1 rounded-[12px] border border-[#e2e8f0] bg-[#f8fafc] p-1 ${className}`}
    >
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            aria-label={option.ariaLabel}
            onClick={() => onChange(option.id)}
            className={`inline-flex items-center justify-center gap-1.5 rounded-[9px] px-3 font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#209bd2] ${
              size === "sm" ? "h-[26px] text-[12px]" : "h-[34px] text-[13px]"
            } ${
              active
                ? "bg-white text-[#0f172a] shadow-[0_1px_3px_rgba(15,23,42,0.1),0_1px_2px_rgba(15,23,42,0.06)]"
                : "text-[#64748b] hover:text-[#0f172a]"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
