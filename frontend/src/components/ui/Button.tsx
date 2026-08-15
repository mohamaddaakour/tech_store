import type { ButtonHTMLAttributes } from "react";
import { Link } from "react-router-dom";
import type { LinkProps } from "react-router-dom";
import { buttonClasses } from "../../lib/buttonStyles";
import type { ButtonSize, ButtonVariant } from "../../lib/buttonStyles";
import { Spinner } from "./Spinner";

/**
 * Extending `ButtonHTMLAttributes` means every real button attribute (`onClick`,
 * `type`, `disabled`, `aria-*`) is accepted and type-checked for free, rather than
 * being re-declared one at a time forever.
 */
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and blocks clicks. Use for in-flight requests. */
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  className,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      // A loading button must not be clickable, or an impatient double-click submits
      // twice — which at checkout means two orders.
      disabled={disabled || loading}
      // Tells assistive tech the control is working, instead of leaving the user with
      // silence after they activated it.
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...rest}
    >
      {loading && <Spinner className="size-3.5" />}
      {children}
    </button>
  );
}

interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

/**
 * A router `Link` styled as a button.
 *
 * Use this, never a `Button` whose `onClick` navigates. A real anchor gives
 * middle-click-to-open-in-a-new-tab, right-click "copy link address", Enter
 * activation, and lets assistive tech announce it as a link rather than a button.
 * None of that is worth losing for styling convenience.
 */
export function ButtonLink({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link className={buttonClasses({ variant, size, fullWidth, className })} {...rest}>
      {children}
    </Link>
  );
}
