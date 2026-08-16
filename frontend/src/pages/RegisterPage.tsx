import { AuthCard } from "../components/auth/AuthCard";

export default function RegisterPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <AuthCard mode="register" />
    </div>
  );
}
