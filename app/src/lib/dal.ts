import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { decrypt, getSessionCookie } from "@/lib/session";

/**
 * Every page/Server Action that touches real data calls this directly —
 * proxy.ts only gives an optimistic redirect for page loads, it isn't the
 * actual guard (a Proxy matcher change could silently stop covering a route).
 */
export const verifySession = cache(async () => {
  const token = await getSessionCookie();
  const session = await decrypt(token);

  if (!session?.isAuth) {
    redirect("/login");
  }

  return { isAuth: true as const };
});
