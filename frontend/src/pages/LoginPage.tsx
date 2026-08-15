import { AuthCard } from "../components/auth/AuthCard";

/**
 * The sign-in page (SUBJECT.md Phase 1: "Login page").
 *
 * A real route rather than a modal, so it can be deep-linked, bookmarked, and
 * redirected to by `ProtectedRoute`. All the logic lives in {@link AuthCard}; this
 * file only positions it.
 */
export default function LoginPage() {
  return (
    // `min-h-[70vh]` rather than `h-screen`: the console shell already provides the
    // header and padding, so a full viewport height here would overflow the page.
    <div className="flex min-h-[70vh] items-center justify-center">
      <AuthCard mode="login" />
    </div>
  );
}
