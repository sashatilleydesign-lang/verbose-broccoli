import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth } from "../../../../_auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  await prisma.task.update({
    where: { id },
    data: { startedAt: new Date() },
  });

  return NextResponse.json({ sessionId: id });
}
