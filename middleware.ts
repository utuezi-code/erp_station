import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const publicPaths = ["/login", "/forgot-password", "/api/auth", "/api/setup"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = publicPaths.some((p) => pathname.startsWith(p));

  // NextAuth v5 uses "authjs.session-token" in dev, "__Secure-authjs.session-token" in prod (HTTPS)
  const token =
    (await getToken({ req, secret: process.env.AUTH_SECRET, cookieName: "__Secure-authjs.session-token" })) ||
    (await getToken({ req, secret: process.env.AUTH_SECRET, cookieName: "authjs.session-token" }));

  if (!token && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (token && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
