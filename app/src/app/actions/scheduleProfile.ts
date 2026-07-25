"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import type { TaskContext } from "@/generated/prisma/enums";

// UserScheduleProfile management (§11.15) — recurring weekly windows,
// per-date exceptions (a day off, or a one-off extra window on an
// otherwise-off day). See scheduler.ts for how these get read.

function minutesFromTimeString(time: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(time);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function parseContext(value: FormDataEntryValue | null): TaskContext | null {
  const s = String(value ?? "").trim();
  return s === "email" || s === "calls" || s === "deep_work" || s === "admin" ? s : null;
}

// A recurring window (dayOfWeek set) when `date` is blank, or a one-off
// extra window for a specific date (the "extra hours on an otherwise-off
// day" exception) when it's filled in.
export async function createWorkWindow(formData: FormData) {
  await verifySession();

  const dayOfWeekRaw = String(formData.get("dayOfWeek") ?? "");
  const dateRaw = String(formData.get("date") ?? "").trim();
  const startMinute = minutesFromTimeString(String(formData.get("startTime") ?? ""));
  const endMinute = minutesFromTimeString(String(formData.get("endTime") ?? ""));
  const context = parseContext(formData.get("context"));
  if (startMinute === null || endMinute === null || endMinute <= startMinute) return;

  if (dateRaw) {
    const date = new Date(`${dateRaw}T00:00:00`);
    if (Number.isNaN(date.getTime())) return;
    await prisma.workWindow.create({ data: { date, startMinute, endMinute, context } });
  } else {
    const dayOfWeek = Number(dayOfWeekRaw);
    if (Number.isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) return;
    await prisma.workWindow.create({ data: { dayOfWeek, startMinute, endMinute, context } });
  }

  revalidatePath("/schedule");
}

export async function deleteWorkWindow(id: string) {
  await verifySession();
  await prisma.workWindow.delete({ where: { id } });
  revalidatePath("/schedule");
}

export async function createDayOff(formData: FormData) {
  await verifySession();
  const dateRaw = String(formData.get("date") ?? "").trim();
  if (!dateRaw) return;
  const date = new Date(`${dateRaw}T00:00:00`);
  if (Number.isNaN(date.getTime())) return;
  await prisma.scheduleDayOff.upsert({ where: { date }, create: { date }, update: {} });
  revalidatePath("/schedule");
}

export async function deleteDayOff(id: string) {
  await verifySession();
  await prisma.scheduleDayOff.delete({ where: { id } });
  revalidatePath("/schedule");
}
