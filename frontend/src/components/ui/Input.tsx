import type { InputHTMLAttributes, Ref } from "react";
import { useId } from "react";
import { cn } from "../../lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Validation message. When present the field turns red and announces the problem. */
  error?: string;
  /**
   * Forwarded to the underlying `<input>`.
   *
   * Declared explicitly because React Hook Form's `register()` returns a `ref`
   * callback that gets spread onto this component. React 19 treats `ref` as an
   * ordinary prop for function components — no `forwardRef` wrapper needed — but it
   * still has to be in the props type or TypeScript rejects the spread.
   */
  ref?: Ref<HTMLInputElement>;
}

/**
 * A labelled text input that reports its own validation error.
 *
 * The accessibility wiring is why this is a component rather than a bare `<input>`
 * with classes on it:
 *
 * - `useId()` generates a unique id per instance so `<label htmlFor>` can point at
 *   the input. That link is what lets you click the label to focus the field, and
 *   what makes a screen reader say "Email, edit text" instead of just "edit text".
 *   A hardcoded `id="email"` breaks the moment the component renders twice.
 * - `aria-invalid` tells assistive tech the value was rejected.
 * - `aria-describedby` points at the error text so the *reason* is read out too. A
 *   red border is invisible to a screen reader, and to the ~8% of men with
 *   red–green colour blindness.
 */
export function Input({ label, error, className, id, ref, ...rest }: InputProps) {
  // Respect a caller-supplied id, otherwise generate a stable unique one.
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
          // The ring is driven by our `error` prop rather than the browser's `:invalid`
          // state, which would go red while the user is still typing their email.
          error
            ? "ring-danger focus:ring-danger"
            : "ring-line hover:ring-line-strong focus:ring-accent",
          // We supply our own focus ring via the ring utilities, so the default
          // outline would double up.
          "outline-none focus:ring-2",
          className,
        )}
        {...rest}
      />

      {error && (
        // `role="alert"` makes a screen reader announce the message the instant it
        // appears, rather than only when the user next tabs onto the field.
        <p id={errorId} role="alert" className="text-xs text-danger animate-fade-in">
          {error}
        </p>
      )}
    </div>
  );
}
