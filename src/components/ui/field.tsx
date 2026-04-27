import { forwardRef } from "react";
import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cx } from "@/lib/cx";

const fieldBase =
  "w-full rounded-[var(--radius-md)] border border-[var(--line-soft)] bg-white/92 px-4 text-[15px] text-[var(--text-strong)] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition-[border-color,box-shadow,background-color] duration-[var(--transition-fast)] ease-[var(--ease-standard)] placeholder:text-[var(--text-subtle)] focus-visible:border-[var(--brand-primary)] focus-visible:bg-white disabled:cursor-not-allowed disabled:opacity-60";

function FieldShell({
  label,
  hint,
  error,
  children,
}: {
  label?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      {label ? (
        <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
          {label}
        </span>
      ) : null}
      {children}
      {error ? (
        <span className="text-[13px] text-[var(--danger)]">{error}</span>
      ) : hint ? (
        <span className="text-[13px] text-[var(--text-subtle)]">{hint}</span>
      ) : null}
    </label>
  );
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { className, label, hint, error, ...props },
  ref,
) {
  return (
    <FieldShell error={error} hint={hint} label={label}>
      <input
        ref={ref}
        className={cx(fieldBase, "h-12", error && "border-[var(--danger)]", className)}
        {...props}
      />
    </FieldShell>
  );
});

type TextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  function TextAreaField({ className, label, hint, error, ...props }, ref) {
    return (
      <FieldShell error={error} hint={hint} label={label}>
        <textarea
          ref={ref}
          className={cx(
            fieldBase,
            "min-h-[132px] py-3 leading-7",
            error && "border-[var(--danger)]",
            className,
          )}
          {...props}
        />
      </FieldShell>
    );
  },
);

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  function SelectField({ className, label, hint, error, children, ...props }, ref) {
    return (
      <FieldShell error={error} hint={hint} label={label}>
        <select
          ref={ref}
          className={cx(
            fieldBase,
            "h-12 appearance-none pr-10",
            error && "border-[var(--danger)]",
            className,
          )}
          {...props}
        >
          {children}
        </select>
      </FieldShell>
    );
  },
);
