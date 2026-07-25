"use server";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

// Reminders v0 (§11.6) — an in-tab toast, zero infrastructure. v1 (real
// Web Push for the daily digest / Waiting-On resurfacing from §10) needs
// a deployed HTTPS domain service workers can register against, so it
// waits on that; this only fires while the app happens to be open.
export type ReminderCandidate = { id: string; kind: "starting" | "atRisk"; title: string };

const START_GRACE_MS = 2 * 60_000;

export async function getReminderCandidates(): Promise<ReminderCandidate[]> {
  await verifySession();
  const now = new Date();

  const startingBlocks = await prisma.scheduledBlock.findMany({
    where: { start: { gte: new Date(now.getTime() - START_GRACE_MS), lte: now } },
    include: { task: true },
  });

  // "Crosses into at risk" = a hard-deadline task whose due date has
  // passed while it's still not done — the moment it stops being
  // hypothetically at-risk and becomes actually overdue.
  const overdueHardTasks = await prisma.task.findMany({
    where: { deadlineType: "hard", dueDate: { lte: now }, state: { in: ["next", "later", "stuck", "waiting"] } },
  });

  return [
    // Keyed on the block's own id, not the task's — reflowSchedule()
    // deletes and recreates every ScheduledBlock from scratch, so a
    // rescheduled task gets a fresh block id and is eligible to remind
    // again, rather than being silently suppressed forever by a stale
    // seen-entry from its previous placement.
    ...startingBlocks.map((b) => ({ id: `start-${b.id}`, kind: "starting" as const, title: b.task.title })),
    ...overdueHardTasks.map((t) => ({ id: `risk-${t.id}`, kind: "atRisk" as const, title: t.title })),
  ];
}
