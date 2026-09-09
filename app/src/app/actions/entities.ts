"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { nextClientColor, CLIENT_COLOR_PALETTE } from "@/lib/clientColors";

// Direct-create actions (DESIGN.md §11.1) — each asks for only a
// name/title, mirroring Quick Capture's philosophy applied to structured
// entities instead of raw text. Everything else stays optional/editable
// later rather than forcing a full form up front.

export async function createClient(formData: FormData) {
  await verifySession();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  // Auto-assigned from the shared palette (§11.7) rather than left at one
  // schema default — every client used to render the exact same orange
  // dot until manually recolored, which defeated the point of the tag.
  const existingCount = await prisma.client.count();
  await prisma.client.create({ data: { name, colorTag: nextClientColor(existingCount) } });
  revalidatePath("/clients");
}

// Client profile (§11.10) — contact info, rate, and relationship notes,
// edited inline on the Workspace page rather than through a separate
// surface. Everything here is optional, same as direct-create. Also
// handles recoloring (§11.7) from the same form's swatch picker.
export async function updateClientProfile(clientId: string, formData: FormData) {
  await verifySession();
  const contactEmail = String(formData.get("contactEmail") ?? "").trim();
  const contactPhone = String(formData.get("contactPhone") ?? "").trim();
  const rate = String(formData.get("rate") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const colorTagRaw = String(formData.get("colorTag") ?? "").trim();
  const colorTag = CLIENT_COLOR_PALETTE.includes(colorTagRaw) ? colorTagRaw : undefined;
  await prisma.client.update({
    where: { id: clientId },
    data: {
      contactEmail: contactEmail || null,
      contactPhone: contactPhone || null,
      rate: rate || null,
      notes: notes || null,
      ...(colorTag ? { colorTag } : {}),
    },
  });
  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
}

export async function createProject(clientId: string, formData: FormData) {
  await verifySession();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await prisma.project.create({ data: { name, clientId } });
  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
}

export async function createTask(projectId: string, formData: FormData) {
  await verifySession();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
  // Starts in "later," same as a triaged Capture item — an explicit
  // "Set next action" elsewhere is what promotes a task to "next,"
  // never creation itself.
  await prisma.task.create({ data: { title, projectId, state: "later" } });

  revalidatePath("/clients");
  revalidatePath("/weekly");
  if (project.clientId) revalidatePath(`/clients/${project.clientId}`);
}
