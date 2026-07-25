"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import type { TaskState } from "@/generated/prisma/enums";

// Enough to reverse a completeTask call (§11.12) — the prior state, and
// which task (if any) got auto-promoted as part of the batch advance, so
// undo can demote it back to "later" and re-pin the original.
export type CompleteTaskUndo = {
  previousState: TaskState;
  batchRevert: { projectId: string; promotedTaskId: string } | null;
};

export async function completeTask(taskId: string): Promise<CompleteTaskUndo> {
  await verifySession();

  const task = await prisma.task.findUniqueOrThrow({
    where: { id: taskId },
    include: { project: true },
  });

  const previousState = task.state;
  const completedAt = new Date();
  // actualMinutes only gets a value if a focus session (§11.3) actually
  // ran — opt-in, never a retroactive "how long did this really take"
  // guess.
  const actualMinutes = task.startedAt
    ? Math.max(1, Math.round((completedAt.getTime() - task.startedAt.getTime()) / 60_000))
    : undefined;

  await prisma.task.update({
    where: { id: taskId },
    data: { state: "done", completedAt, actualMinutes, startedAt: null },
  });

  // A done task shouldn't keep occupying a slot on the calendar until the
  // next reflow happens to clear it out.
  await prisma.scheduledBlock.deleteMany({ where: { taskId } });

  // If this was its project's pinned next action, auto-advance the batch:
  // promote the next "later" task in line rather than leaving the project
  // with no next action set.
  let batchRevert: CompleteTaskUndo["batchRevert"] = null;
  if (task.projectId && task.project?.nextActionId === taskId) {
    const upNext = await prisma.task.findFirst({
      where: { projectId: task.projectId, state: "later" },
      orderBy: [{ batchIndex: "asc" }, { createdAt: "asc" }],
    });

    if (upNext) {
      await prisma.task.update({ where: { id: upNext.id }, data: { state: "next" } });
      await prisma.project.update({
        where: { id: task.projectId },
        data: { nextActionId: upNext.id },
      });
      batchRevert = { projectId: task.projectId, promotedTaskId: upNext.id };
    } else {
      await prisma.project.update({
        where: { id: task.projectId },
        data: { nextActionId: null },
      });
    }
  }

  revalidatePath("/focus");
  revalidatePath("/clients");
  revalidatePath("/weekly");
  revalidatePath("/schedule");
  if (task.project?.clientId) revalidatePath(`/clients/${task.project.clientId}`);

  return { previousState, batchRevert };
}

// Reverses completeTask (§11.12) — a short-lived "Undo" toast after the
// handful of destructive-feeling moments, not general-purpose undo/redo
// history. Doesn't attempt to restore the deleted ScheduledBlock; the
// next Reflow recomputes it same as for any other un-done task.
export async function undoCompleteTask(taskId: string, undo: CompleteTaskUndo) {
  await verifySession();
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { state: undo.previousState, completedAt: null, actualMinutes: null },
    include: { project: true },
  });

  if (undo.batchRevert) {
    await prisma.task.update({ where: { id: undo.batchRevert.promotedTaskId }, data: { state: "later" } });
    await prisma.project.update({
      where: { id: undo.batchRevert.projectId },
      data: { nextActionId: taskId },
    });
  }

  revalidatePath("/focus");
  revalidatePath("/clients");
  revalidatePath("/weekly");
  revalidatePath("/schedule");
  if (task.project?.clientId) revalidatePath(`/clients/${task.project.clientId}`);
}

// Focus session (§11.3) — opt-in, visible countdown. Starting (re)arms
// the clock from now; there's no partial-session accumulation, so a
// forgotten session can never silently produce a nonsense multi-day
// actualMinutes on eventual completion.
export async function startSession(taskId: string) {
  await verifySession();
  await prisma.task.update({ where: { id: taskId }, data: { startedAt: new Date() } });
  revalidatePath("/focus");
}

// Abandons the current session without completing the task — no
// actualMinutes gets recorded for it. Always available as a quiet way
// out, no "are you sure" friction.
export async function endSession(taskId: string) {
  await verifySession();
  await prisma.task.update({ where: { id: taskId }, data: { startedAt: null } });
  revalidatePath("/focus");
}

// Task.note (§11.9) has existed since the schema's first draft, but
// nothing in the UI opened it for reading or editing until now. Also
// saves Task.targetDate (§11.14) from the same modal — self-imposed
// urgency, distinct from a real dueDate, and never read by the
// scheduler's at-risk logic (see scheduler.ts).
export async function updateTaskNote(taskId: string, note: string, targetDateMs: number | null) {
  await verifySession();
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { note: note.trim() || null, targetDate: targetDateMs === null ? null : new Date(targetDateMs) },
    include: { project: true },
  });
  revalidatePath("/focus");
  revalidatePath("/weekly");
  revalidatePath("/clients");
  revalidatePath("/schedule");
  if (task.project?.clientId) revalidatePath(`/clients/${task.project.clientId}`);
}
