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

export async function deleteCalendarEvent(eventId: string) {
  await verifySession();
  await prisma.calendarEvent.delete({ where: { id: eventId } });
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
