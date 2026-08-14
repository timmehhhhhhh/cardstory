import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <div className="mx-auto flex max-w-sm flex-col justify-center px-4 py-16 sm:py-24">
      <h1 className="mb-6 text-center text-2xl font-bold tracking-tight">Create your account</h1>
      <SignupForm />
    </div>
  );
}
