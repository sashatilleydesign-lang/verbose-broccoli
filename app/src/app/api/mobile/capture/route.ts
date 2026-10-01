import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth } from "../_auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;

  const [threads, captures] = await Promise.all([
    prisma.emailThread.findMany({
      where: { status: "unprocessed" },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { messages: { orderBy: { receivedAt: "desc" }, take: 1 } },
    }),
    prisma.captureItem.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  return NextResponse.json({
    threads: threads.map((t) => ({
      id: t.id,
      subject: t.subject,
      from: t.messages[0]?.fromEmail ?? "",
      receivedAt: t.messages[0]?.receivedAt.toISOString() ?? null,
    })),
    items: captures.map((c) => ({
      id: c.id,
      text: c.text,
      createdAt: c.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    })),
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { text } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: "Text required" }, { status: 400 });

  const capture = await prisma.captureItem.create({ data: { text: text.trim() } });
  return NextResponse.json({ id: capture.id });
}
