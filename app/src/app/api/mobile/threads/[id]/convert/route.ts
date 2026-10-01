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

  const thread = await prisma.emailThread.findUnique({
    where: { id },
    include: { messages: { orderBy: { receivedAt: "desc" }, take: 1 } },
  });
  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const title = thread.subject.replace(/^(re|fwd):\s*/i, "").trim() || "Email follow-up";

  const task = await prisma.task.create({
    data: {
      title,
      state: "later",
      emailLinks: { create: { threadId: id } },
    },
  });

  await prisma.emailThread.update({ where: { id }, data: { status: "triaged" } });

  return NextResponse.json({ taskId: task.id });
}
