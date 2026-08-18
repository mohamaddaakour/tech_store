import type { InputHTMLAttributes, Ref } from "react";
import { useId } from "react";
import { cn } from "../../lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;

  error?: string;

  ref?: Ref<HTMLInputElement>;
}

export function Input({ label, error, className, id, ref, ...rest }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-xs font-medium text-ink-muted">
        {label}
      </label>

      <input
        id={inputId}
        ref={ref}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          "h-10 w-full rounded-control bg-surface-2 px-3 text-sm text-ink",
          "placeholder:text-ink-faint",
          "ring-1 transition-[box-shadow,background-color] duration-150",

          error
            ? "ring-danger focus:ring-danger"
            : "ring-line hover:ring-line-strong focus:ring-accent",

          "outline-none focus:ring-2",
          className,
        )}
        {...rest}
      />

      {error && (
        <p id={errorId} role="alert" className="text-xs text-danger animate-fade-in">
          {error}
        </p>
      )}
    </div>
  );
}
