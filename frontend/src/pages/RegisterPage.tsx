import { AuthCard } from "../components/auth/AuthCard";

/** The create-account page (SUBJECT.md Phase 1: "Register page"). */
export default function RegisterPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <AuthCard mode="register" />
    </div>
  );
}
