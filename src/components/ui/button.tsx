"use client";

import { forwardRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { HTMLMotionProps } from "motion/react";
import { cx } from "@/lib/cx";
import { Spinner } from "./spinner";

type ButtonVariant = "primary" | "secondary" | "ghost" | "soft" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-(--brand-primary-strong) text-white shadow-(--shadow-accent) hover:bg-(--brand-primary)",
  secondary:
    "border border-(--line-soft) bg-white/84 text-(--text-strong) hover:border-(--line-strong) hover:bg-white",
  ghost:
    "text-(--text-strong) hover:bg-black/[0.04]",
  soft:
    "bg-(--brand-primary-soft) text-(--brand-primary-dark) hover:bg-[rgba(56,193,255,0.18)]",
  danger:
    "bg-(--danger) text-white shadow-[0_18px_40px_rgba(255,61,0,0.22)] hover:bg-[#e93a00]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-10 px-4 text-sm",
  md: "h-12 px-5 text-[15px]",
  lg: "h-14 px-6 text-base",
};

export function buttonStyles({
  variant = "primary",
  size = "md",
  block,
  disabled,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return cx(
    "inline-flex max-w-full items-center justify-center gap-2 rounded-(--radius-pill) text-center font-semibold tracking-[-0.01em] transition-[transform,background-color,border-color,box-shadow,color,opacity] duration-150 ease-out focus-visible:outline-none disabled:pointer-events-none",
    variantClasses[variant],
    sizeClasses[size],
    block && "w-full",
    disabled && "opacity-60",
    className,
  );
}

type ButtonProps = Omit<HTMLMotionProps<"button">, "children"> & {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      children,
      className,
      variant = "primary",
      size = "md",
      block,
      loading,
      disabled,
      ...props
    },
    ref,
  ) {
    const reduceMotion = useReducedMotion();

    return (
      <motion.button
        ref={ref}
        className={buttonStyles({
          variant,
          size,
          block,
          disabled: disabled || loading,
          className,
        })}
        disabled={disabled || loading}
        transition={reduceMotion ? undefined : { duration: 0.16 }}
        whileHover={
          reduceMotion || disabled || loading ? undefined : { y: -1, scale: 1.01 }
        }
        whileTap={reduceMotion || disabled || loading ? undefined : { scale: 0.985 }}
        {...props}
      >
        {loading ? <Spinner className="h-4 w-4" /> : null}
        <span className="min-w-0 truncate">{children}</span>
      </motion.button>
    );
  },
);
