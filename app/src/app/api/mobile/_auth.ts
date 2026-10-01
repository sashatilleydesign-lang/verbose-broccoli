import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/lib/session";

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function requireMobileAuth(req: NextRequest): Promise<{ ok: true } | NextResponse> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return unauthorized();
  const token = auth.slice(7);
  const session = await decrypt(token);
  if (!session?.isAuth) return unauthorized();
  return { ok: true };
}
