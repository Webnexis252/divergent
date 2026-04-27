"use client";

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function BaseIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    />
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="10" cy="8" r="4" />
      <path d="M21 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 4.13a4 4 0 0 1 0 7.75" />
    </BaseIcon>
  );
}

export function BookOpenIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </BaseIcon>
  );
}

export function MessageSquareIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </BaseIcon>
  );
}

export function GraduationCapIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m22 10-10-5L2 10l10 5 10-5Z" />
      <path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" />
    </BaseIcon>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </BaseIcon>
  );
}

export function MoreVerticalIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="19" r="1" />
    </BaseIcon>
  );
}

export function PauseCircleIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 9v6" />
      <path d="M14 9v6" />
    </BaseIcon>
  );
}

export function DollarSignIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 2v20" />
      <path d="M17 6.5c0-1.93-2.24-3.5-5-3.5s-5 1.57-5 3.5 2.24 3.5 5 3.5 5 1.57 5 3.5-2.24 3.5-5 3.5-5-1.57-5-3.5" />
    </BaseIcon>
  );
}

export function CreditCardIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 10.5h19" />
      <path d="M7 15h3" />
    </BaseIcon>
  );
}

export function ActivityIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M3 12h4l2.5-5 4 10 2.5-5H21" />
    </BaseIcon>
  );
}

export function TagIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m20.59 13.41-7.18 7.18a2 2 0 0 1-2.82 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z" />
      <path d="M7 7h.01" />
    </BaseIcon>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </BaseIcon>
  );
}

export function TicketPercentIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 9V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3a3 3 0 0 0 0 6v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3a3 3 0 0 0 0-6Z" />
      <path d="m9 15 6-6" />
      <circle cx="9.5" cy="9.5" r=".5" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="14.5" r=".5" fill="currentColor" stroke="none" />
    </BaseIcon>
  );
}
