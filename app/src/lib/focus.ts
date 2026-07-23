import "server-only";
import { prisma } from "@/lib/prisma";

const DEADLINE_WINDOW_MS = 24 * 60 * 60 * 1000;
const STALE_EMAIL_MS = 48 * 60 * 60 * 1000;

export async function getFocusData() {
  const now = new Date();
  const deadlineCutoff = new Date(now.getTime() + DEADLINE_WINDOW_MS);
  const staleEmailCutoff = new Date(now.getTime() - STALE_EMAIL_MS);

  const deadlineTask = await prisma.task.findFirst({
    where: {
      state: { not: "done" },
      dueDate: { lte: deadlineCutoff },
    },
    orderBy: { dueDate: "asc" },
    include: { project: { include: { client: true } } },
  });

  const nextTask = await prisma.task.findFirst({
    where: {
      state: "next",
      id: deadlineTask ? { not: deadlineTask.id } : undefined,
    },
    orderBy: { createdAt: "asc" },
    include: { project: { include: { client: true } } },
  });

  let batchProgress: { done: number; total: number } | null = null;
  if (nextTask?.projectId && nextTask.batchTotal) {
    const doneCount = await prisma.task.count({
      where: { projectId: nextTask.projectId, state: "done" },
    });
    batchProgress = { done: doneCount, total: nextTask.batchTotal };
  }

  const emailThread = await prisma.emailThread.findFirst({
    where: {
      status: "unprocessed",
      messages: { some: { receivedAt: { lte: staleEmailCutoff } } },
    },
    orderBy: { createdAt: "asc" },
    include: {
      client: true,
      messages: { orderBy: { receivedAt: "desc" }, take: 1 },
    },
  });

  return { nextTask, batchProgress, deadlineTask, emailThread };
}
