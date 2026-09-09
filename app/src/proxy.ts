import { NextRequest, NextResponse } from "next/server";
import { decrypt, COOKIE_NAME } from "@/lib/session";

const publicRoutes = ["/login"];

// Optimistic check only — cheap cookie decrypt, no DB hit, since this runs on
// every route. The real guard is verifySession() in src/lib/dal.ts, called
// from every page and Server Action. Never rely on this alone: see the
// warning in next/dist/docs .../file-conventions/proxy.md.
export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isPublicRoute = publicRoutes.includes(path);

  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  const session = await decrypt(cookie);

  if (!isPublicRoute && !session?.isAuth) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (isPublicRoute && session?.isAuth) {
    return NextResponse.redirect(new URL("/focus", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
