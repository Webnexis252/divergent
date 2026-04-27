"use client";

import dynamic from "next/dynamic";
import type { CalendarWorkspaceProps } from "./calendar-workspace";

const CalendarWorkspace = dynamic(
  () => import("./calendar-workspace").then((mod) => mod.CalendarWorkspace),
  {
    loading: () => (
      <div className="space-y-8">
        <div className="h-[300px] animate-pulse rounded-[36px] bg-[linear-gradient(135deg,rgba(15,23,42,0.08),rgba(56,193,255,0.14))]" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="surface-panel h-[176px] animate-pulse rounded-[var(--radius-xl)]"
            />
          ))}
        </div>
        <div className="space-y-6">
          <div className="surface-panel h-24 animate-pulse rounded-[var(--radius-xl)]" />
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
            <div className="surface-panel h-[580px] animate-pulse rounded-[var(--radius-xl)]" />
            <div className="surface-panel h-[580px] animate-pulse rounded-[var(--radius-xl)]" />
          </div>
          <div className="surface-panel h-72 animate-pulse rounded-[var(--radius-xl)]" />
        </div>
      </div>
    ),
    ssr: false,
  },
);

export function CalendarWorkspaceClient(props: CalendarWorkspaceProps) {
  return <CalendarWorkspace {...props} />;
}
