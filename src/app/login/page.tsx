import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <div className="mx-auto flex max-w-sm flex-col justify-center px-4 py-16 sm:py-24">
      <h1 className="mb-6 text-center text-2xl font-bold tracking-tight">Log in</h1>
      <LoginForm />
    </div>
  );
}
