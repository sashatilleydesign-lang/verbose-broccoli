"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

export async function archiveThread(threadId: string) {
  await verifySession();
  await prisma.emailThread.update({ where: { id: threadId }, data: { status: "archived" } });
  revalidatePath("/focus");
}

export async function convertThreadToTask(threadId: string) {
  await verifySession();

  const thread = await prisma.emailThread.findUniqueOrThrow({ where: { id: threadId } });
  const lower = thread.subject.toLowerCase();
  const context = lower.includes("call") ? "calls" : lower.includes("invoice") ? "admin" : null;

  const task = await prisma.task.create({
    data: {
      title: thread.subject,
      state: "later",
      context,
    },
  });

  await prisma.taskEmailLink.create({ data: { taskId: task.id, threadId } });
  await prisma.emailThread.update({ where: { id: threadId }, data: { status: "triaged" } });

  revalidatePath("/focus");
}
