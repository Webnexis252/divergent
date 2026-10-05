import { cx } from "@/lib/cx";

// Soft background / strong text pairs; a name always maps to the same pair.
const PALETTE = [
  ["#e0f2fe", "#0369a1"],
  ["#fef3c7", "#b45309"],
  ["#dcfce7", "#15803d"],
  ["#ede9fe", "#6d28d9"],
  ["#ffe4e6", "#be123c"],
  ["#e0e7ff", "#4338ca"],
] as const;

function initialsOf(name?: string | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function colorsOf(name?: string | null) {
  let hash = 0;
  for (const ch of name ?? "") hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

/**
 * A person's initials in a tinted circle: the stand-in for a missing profile
 * photo (instead of generated cartoon or abstract avatars). Size it with
 * className, e.g. "h-10 w-10 text-sm".
 */
export function InitialsAvatar({ name, className }: { name?: string | null; className?: string }) {
  const [background, color] = colorsOf(name);
  return (
    <span
      aria-hidden="true"
      className={cx("inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold", className)}
      style={{ backgroundColor: background, color }}
    >
      {initialsOf(name)}
    </span>
  );
}
