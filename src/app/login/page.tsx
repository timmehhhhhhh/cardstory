import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage() {
  // Bounces an already-logged-in visitor off to /pc. This used to be
  // src/proxy.ts's only job; it moved here (and into signup/page.tsx)
  // because Next.js 16 always runs Proxy on the Node.js runtime with no
  // opt-out (see node_modules/next/dist/docs/.../proxy.md's "Runtime"
  // section), which @opennextjs/cloudflare's Workers deployment rejects
  // outright as "Node.js middleware is not currently supported". A plain
  // server component redirect has no such restriction and behaves
  // identically for this single-route check.
  const session = await auth();
  if (session?.user) redirect("/pc");

  return (
    <div className="mx-auto flex max-w-sm flex-col justify-center px-4 py-16 sm:py-24">
      <h1 className="mb-6 text-center text-2xl font-bold tracking-tight">Log in</h1>
      <LoginForm />
    </div>
  );
}
