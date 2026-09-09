"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

export async function createCaptureItem(formData: FormData) {
  await verifySession();
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return;
  await prisma.captureItem.create({ data: { text } });
  revalidatePath("/capture");
}

export async function convertCaptureToTask(captureId: string) {
  await verifySession();
  const item = await prisma.captureItem.findUniqueOrThrow({ where: { id: captureId } });
  await prisma.task.create({ data: { title: item.text, state: "later" } });
  await prisma.captureItem.update({ where: { id: captureId }, data: { triaged: true } });
  revalidatePath("/capture");
}

export async function discardCaptureItem(captureId: string) {
  await verifySession();
  await prisma.captureItem.delete({ where: { id: captureId } });
  revalidatePath("/capture");
}

// Reverses discardCaptureItem (§11.12) — a fresh row rather than
// resurrecting the deleted one by id; nothing else references a
// CaptureItem's id, so the distinction is invisible to the user.
export async function restoreCaptureItem(text: string) {
  await verifySession();
  await prisma.captureItem.create({ data: { text } });
  revalidatePath("/capture");
}
