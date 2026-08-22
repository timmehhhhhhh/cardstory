import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Sign up" };

export default async function SignupPage() {
  // See login/page.tsx's comment — same reasoning, same behavior, moved
  // here from the now-removed src/proxy.ts.
  const session = await auth();
  if (session?.user) redirect("/pc");

  return (
    <div className="mx-auto flex max-w-sm flex-col justify-center px-4 py-16 sm:py-24">
      <h1 className="mb-6 text-center text-2xl font-bold tracking-tight">Create your account</h1>
      <SignupForm />
    </div>
  );
}
