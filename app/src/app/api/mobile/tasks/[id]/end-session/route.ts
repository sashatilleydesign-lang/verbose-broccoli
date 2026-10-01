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

  const task = await prisma.task.findUnique({ where: { id }, select: { startedAt: true } });
  const data: { startedAt: null; actualMinutes?: number } = { startedAt: null };

  if (task?.startedAt) {
    const elapsed = Math.round((Date.now() - task.startedAt.getTime()) / 60000);
    data.actualMinutes = elapsed;
  }

  await prisma.task.update({ where: { id }, data });

  return NextResponse.json({ ok: true });
}
