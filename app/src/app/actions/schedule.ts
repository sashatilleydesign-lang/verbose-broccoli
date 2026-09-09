"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { reflowSchedule } from "@/lib/scheduler";

export async function reflowScheduleAction() {
  await verifySession();
  const result = await reflowSchedule();
  revalidatePath("/schedule");
  revalidatePath("/focus");
  return result;
}

export async function createCalendarEvent(formData: FormData) {
  await verifySession();

  const title = String(formData.get("title") ?? "").trim();
  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");
  if (!title || !date || !startTime || !endTime) return;

  const start = new Date(`${date}T${startTime}:00`);
  const end = new Date(`${date}T${endTime}:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return;

  await prisma.calendarEvent.create({ data: { title, start, end } });
  revalidatePath("/schedule");
}

// Click-to-create (§11.8) — the same "just a name" minimal quick-add as
// §11.1, applied to the calendar: everything but the title is inferred
// from where the user clicked, rather than requiring a scroll down to
// the full "Add a fixed event" form every time. 30 minutes is a
// placeholder duration, editable later same as any other quick-created
// entity — there's no edit UI for CalendarEvent yet, so for now that
// means deleting and re-adding if the guess is wrong.
const QUICK_ADD_DURATION_MS = 30 * 60_000;

export async function createCalendarEventQuick(startMs: number, formData: FormData) {
  await verifySession();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const start = new Date(startMs);
  const end = new Date(startMs + QUICK_ADD_DURATION_MS);
  await prisma.calendarEvent.create({ data: { title, start, end } });
  revalidatePath("/schedule");
}

export async function deleteCalendarEvent(eventId: string) {
  await verifySession();
  await prisma.calendarEvent.delete({ where: { id: eventId } });
  revalidatePath("/schedule");
}

// Reverses deleteCalendarEvent (§11.12) — a fresh row with the same
// title/start/end, not a resurrection of the deleted id; nothing else
// references a CalendarEvent's id.
export async function restoreCalendarEvent(title: string, startMs: number, endMs: number) {
  await verifySession();
  await prisma.calendarEvent.create({ data: { title, start: new Date(startMs), end: new Date(endMs) } });
  revalidatePath("/schedule");
}

// Manual drag-and-drop move. Deliberately doesn't "pin" the block against
// future reflows — the next "Reflow schedule" click still recomputes
// every block from scratch (see scheduler.ts), so a manual move is a
// same-session nudge, not a permanent override.
export async function moveScheduledBlock(blockId: string, newStartMs: number) {
  await verifySession();

  const block = await prisma.scheduledBlock.findUnique({ where: { id: blockId } });
  if (!block) return;

  const durationMs = block.end.getTime() - block.start.getTime();
  const start = new Date(newStartMs);
  const end = new Date(newStartMs + durationMs);

  await prisma.scheduledBlock.update({ where: { id: blockId }, data: { start, end } });
  revalidatePath("/schedule");
}

// Dragging a block's edge (§11.4) is a different edit than moving it: it's
// correcting how long the task actually takes, not just when it happens.
// So — unlike moveScheduledBlock — this writes back to the task's
// estimatedMinutes, which is what the next Reflow reads to size the block.
// Skipping that write would mean every resize gets silently discarded on
// the next reflow. Exception: a task split across multiple slots (§11.16)
// has no single block whose duration equals the task's total — resizing
// one chunk there is just a same-session nudge to that chunk, same as a
// plain move, since there's no way to infer the new *total* from one part
// alone.
export async function resizeScheduledBlock(blockId: string, newDurationMinutes: number) {
  await verifySession();

  const block = await prisma.scheduledBlock.findUnique({ where: { id: blockId } });
  if (!block) return;

  const clampedMinutes = Math.max(5, Math.round(newDurationMinutes));
  const end = new Date(block.start.getTime() + clampedMinutes * 60_000);

  if (block.partTotal && block.partTotal > 1) {
    await prisma.scheduledBlock.update({ where: { id: blockId }, data: { end } });
  } else {
    await prisma.$transaction([
      prisma.scheduledBlock.update({ where: { id: blockId }, data: { end } }),
      prisma.task.update({ where: { id: block.taskId }, data: { estimatedMinutes: clampedMinutes } }),
    ]);
  }
  revalidatePath("/schedule");
  revalidatePath("/focus");
}
