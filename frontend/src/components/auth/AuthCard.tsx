import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { getErrorMessage, getFieldErrors } from "../../api/client";
import { useLogin, useRegister } from "../../hooks/useAuth";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

/**
 * Validation schema, shared by both modes.
 *
 * Zod is the single source of truth: it validates at runtime AND its inferred type
 * (`FormValues`) types the form. Without that link the two drift — you add a field to
 * the schema, forget the interface, and TypeScript happily lets you read a property
 * that is never validated.
 */
const schema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    // Matches the backend's `@Size(min = 8)` on RegisterRequest. Keeping the two in
    // step means the user gets instant feedback instead of a server round trip.
    .min(8, "Password must be at least 8 characters"),
});

type FormValues = z.infer<typeof schema>;

interface AuthCardProps {
  mode: "login" | "register";
}

/**
 * The sign-in / create-account card, used by both auth pages.
 *
 * One component for both because they differ only in which endpoint they call and
 * some wording. Two near-identical forms inevitably drift apart.
 *
 * Validation happens in two layers and both are necessary:
 *
 * 1. **Here, via Zod** — instant feedback, no wasted round trip on an empty field.
 * 2. **On the server**, whose `fieldErrors` are merged in below. This is the layer
 *    that actually protects the database, since anyone can `curl` the endpoint.
 *    Client-side validation is a courtesy, never a security control.
 */
export function AuthCard({ mode }: AuthCardProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const activeMutation = mode === "login" ? loginMutation : registerMutation;

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    // Validate when a field loses focus rather than on every keystroke, so the email
    // box does not turn red while you are still halfway through typing it.
    mode: "onBlur",
  });

  /**
   * Where to go after signing in.
   *
   * `ProtectedRoute` stores the page the user was trying to reach in
   * `location.state.from`. Honouring it means someone who deep-linked to /checkout
   * lands back on /checkout, not on the dashboard having lost their place.
   */
  const redirectTo = (location.state as { from?: string } | null)?.from ?? "/";

  /** Per-field messages returned by the backend, e.g. `{ email: "…" }`. */
  const serverFieldErrors = getFieldErrors(activeMutation.error);

  /**
   * A single top-level message: wrong password, email taken, backend unreachable.
   * Suppressed when field errors exist, because those are already shown in context
   * and repeating "Some fields are invalid" above them is noise.
   */
  const formError =
    activeMutation.error && Object.keys(serverFieldErrors).length === 0
      ? getErrorMessage(activeMutation.error)
      : null;

  function onSubmit(values: FormValues) {
    activeMutation.mutate(values, {
      onSuccess: (data) => {
        toast.success(
          mode === "login" ? `Welcome back, ${data.user.email}` : "Account created — welcome!",
        );
        // `replace` so Back does not return to the login form of a session the user
        // is now signed into.
        navigate(redirectTo, { replace: true });
      },
    });
  }

  const isLogin = mode === "login";

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.25, 1, 0.5, 1] }}
      className="w-full max-w-sm overflow-hidden rounded-panel glass p-7 shadow-2xl"
    >
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <span className="grid size-11 place-items-center rounded-control gradient-accent animate-gradient text-accent-ink">
          <Sparkles className="size-5" />
        </span>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-ink">
            {isLogin ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1 text-xs text-ink-muted">
            {isLogin
              ? "Sign in to track orders and keep your collection."
              : "One account for your cart, collection and orders."}
          </p>
        </div>
      </div>

      {/* `noValidate` hands validation to Zod. Without it the browser's own bubbles
          fire first and you get two competing, differently-worded error systems. */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <Input
          label="Email"
          type="email"
          // `autoComplete` is what lets a password manager recognise the field.
          // Users of one notice immediately when it is missing.
          autoComplete="email"
          placeholder="you@example.com"
          // `register` wires value, onChange, onBlur and the ref in one spread.
          {...registerField("email")}
          error={errors.email?.message ?? serverFieldErrors.email}
        />

        <Input
          label="Password"
          type="password"
          // "current-password" prompts a manager to offer a saved credential;
          // "new-password" prompts it to generate and save one.
          autoComplete={isLogin ? "current-password" : "new-password"}
          placeholder={isLogin ? "••••••••" : "At least 8 characters"}
          {...registerField("password")}
          error={errors.password?.message ?? serverFieldErrors.password}
        />

        {formError && (
          // `role="alert"` makes screen readers announce this the moment it appears.
          <p
            role="alert"
            className="rounded-control bg-danger-soft px-3 py-2 text-xs text-danger animate-fade-in"
          >
            {formError}
          </p>
        )}

        <Button type="submit" fullWidth loading={activeMutation.isPending}>
          {isLogin ? "Sign in" : "Create account"}
        </Button>
      </form>

      <p className="mt-5 text-center text-xs text-ink-muted">
        {isLogin ? "New to TechStore? " : "Already have an account? "}
        <Link
          to={isLogin ? "/register" : "/login"}
          // Carry the redirect through, so switching between the two forms does not
          // lose where the user was originally headed.
          state={{ from: redirectTo }}
          className="font-semibold text-accent hover:underline"
        >
          {isLogin ? "Create an account" : "Sign in"}
        </Link>
      </p>
    </motion.div>
  );
}
