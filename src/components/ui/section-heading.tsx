import { cx } from "@/lib/cx";

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
  align = "left",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  align?: "left" | "center";
}) {
  return (
    <div
      className={cx(
        "flex flex-col gap-4 md:flex-row md:items-end md:justify-between",
        align === "center" && "items-center text-center md:flex-col md:items-center",
        className,
      )}
    >
      <div className={cx("space-y-3", align === "center" && "mx-auto max-w-2xl")}>
        {eyebrow ? <p className="section-eyebrow">{eyebrow}</p> : null}
        <h2 className="text-[clamp(1.9rem,3.4vw,3.35rem)] font-semibold tracking-[-0.06em] text-(--text-strong) text-balance">
          {title}
        </h2>
        {description ? (
          <p className="max-w-[64ch] text-[15px] leading-7 text-(--text-muted) text-pretty">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
