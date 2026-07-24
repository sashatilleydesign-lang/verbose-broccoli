"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

// Direct-create actions (DESIGN.md §11.1) — each asks for only a
// name/title, mirroring Quick Capture's philosophy applied to structured
// entities instead of raw text. Everything else stays optional/editable
// later rather than forcing a full form up front.

export async function createClient(formData: FormData) {
  await verifySession();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await prisma.client.create({ data: { name } });
  revalidatePath("/clients");
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
