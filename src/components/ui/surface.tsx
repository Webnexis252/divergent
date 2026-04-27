import type { ElementType, HTMLAttributes } from "react";
import { cx } from "@/lib/cx";

type SurfaceTone = "panel" | "elevated" | "muted" | "dark";

const toneClasses: Record<SurfaceTone, string> = {
  panel: "surface-panel",
  elevated: "surface-elevated",
  muted: "surface-muted",
  dark: "surface-dark",
};

type SurfaceProps<T extends ElementType> = {
  as?: T;
  tone?: SurfaceTone;
  className?: string;
  children: React.ReactNode;
} & Omit<HTMLAttributes<HTMLElement>, "className">;

export function Surface<T extends ElementType = "div">({
  as,
  tone = "panel",
  className,
  children,
  ...props
}: SurfaceProps<T>) {
  const Component = (as ?? "div") as ElementType;

  return (
    <Component className={cx(toneClasses[tone], className)} {...props}>
      {children}
    </Component>
  );
}
