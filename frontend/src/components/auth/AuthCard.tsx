import { useState } from "react";
import { z } from "zod";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Sparkles } from "../ui/icons";
import { toast } from "../../store/toastStore";
import { getErrorMessage, getFieldErrors } from "../../api/client";
import { useLogin, useRegister } from "../../hooks/useAuth";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

const schema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters"),
});

type FormValues = z.infer<typeof schema>;

interface AuthCardProps {
  mode: "login" | "register";
}

export function AuthCard({ mode }: AuthCardProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const activeMutation = mode === "login" ? loginMutation : registerMutation;

  const [values, setValues] = useState<FormValues>({ email: "", password: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});

  const redirectTo = (location.state as { from?: string } | null)?.from ?? "/";

  const serverFieldErrors = getFieldErrors(activeMutation.error);

  const formError =
    activeMutation.error && Object.keys(serverFieldErrors).length === 0
      ? getErrorMessage(activeMutation.error)
      : null;

  function updateField(field: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function validateField(field: keyof FormValues) {
    const result = schema.shape[field].safeParse(values[field]);
    setErrors((current) => ({
      ...current,
      [field]: result.success ? undefined : result.error.issues[0]?.message,
    }));
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    const result = schema.safeParse(values);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof FormValues, string>> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FormValues;
        fieldErrors[field] ??= issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    activeMutation.mutate(result.data, {
      onSuccess: (data) => {
        toast.success(
          mode === "login" ? `Welcome back, ${data.user.email}` : "Account created — welcome!",
        );
        navigate(redirectTo, { replace: true });
      },
    });
  }

  const isLogin = mode === "login";

  return (
    <div className="animate-rise w-full max-w-sm overflow-hidden rounded-panel glass p-7 shadow-2xl">
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

      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={values.email}
          onChange={(event) => updateField("email", event.target.value)}
          onBlur={() => validateField("email")}
          error={errors.email ?? serverFieldErrors.email}
        />

        <Input
          label="Password"
          type="password"
          autoComplete={isLogin ? "current-password" : "new-password"}
          placeholder={isLogin ? "••••••••" : "At least 8 characters"}
          value={values.password}
          onChange={(event) => updateField("password", event.target.value)}
          onBlur={() => validateField("password")}
          error={errors.password ?? serverFieldErrors.password}
        />

        {formError && (
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
          state={{ from: redirectTo }}
          className="font-semibold text-accent hover:underline"
        >
          {isLogin ? "Create an account" : "Sign in"}
        </Link>
      </p>
    </div>
  );
}
