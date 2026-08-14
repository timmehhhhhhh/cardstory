import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";

// Optimistic-only, per Next 16's own docs: proxy.ts is not a full
// authorization gate (it can't safely cover Server Actions the matcher
// excludes, and shouldn't be trusted alone). Its only job here is to bounce
// an already-logged-in visitor off /login and /signup. It deliberately does
// NOT gate /portfolio — logged-out users must keep full anonymous access
// (portfolios stay local-only until sign-in). Real authorization for
// portfolio data lives in each /api/portfolio/* route handler instead.
export async function proxy(request: NextRequest) {
  const session = await auth();
  if (session?.user && ["/login", "/signup"].includes(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/portfolio", request.url));
  }
}

export const config = {
  matcher: ["/login", "/signup"],
};
