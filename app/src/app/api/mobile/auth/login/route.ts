import { NextRequest, NextResponse } from "next/server";
import { encrypt } from "@/lib/session";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  const expectedEmail = process.env.AUTH_EMAIL;
  const expectedPassword = process.env.AUTH_PASSWORD;

  if (!expectedEmail || !expectedPassword) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 500 });
  }

  if (email !== expectedEmail || password !== expectedPassword) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = await encrypt({ isAuth: true });
  return NextResponse.json({ token });
}
