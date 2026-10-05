import { Star } from "lucide-react";
import { cx } from "@/lib/cx";

/** A row of filled star icons (instead of "★★★★★" text). */
export function StarRating({
  value = 5,
  max = 5,
  className,
  starClassName = "h-4 w-4",
}: {
  value?: number;
  max?: number;
  className?: string;
  starClassName?: string;
}) {
  return (
    <span className={cx("inline-flex items-center gap-0.5", className)} aria-label={`${value} out of ${max} stars`} role="img">
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          aria-hidden="true"
          className={cx(starClassName, i < Math.round(value) ? "fill-current" : "opacity-30")}
        />
      ))}
    </span>
  );
}
