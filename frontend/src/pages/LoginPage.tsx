import { AuthCard } from "../components/auth/AuthCard";

export default function LoginPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <AuthCard mode="login" />
    </div>
  );
}
