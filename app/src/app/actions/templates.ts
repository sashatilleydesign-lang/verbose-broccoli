"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

// Manually-invoked project templates (§11.5) — the fix for repeatable
// project shapes (e.g. Lumen's "10 ads" batch) without auto-recurrence.
// Structure only: titles, order, energy/context tags, estimated
// durations. No dates are ever templated, matching the project's
// existing "due date if real, not invented" rule.

export async function saveProjectAsTemplate(projectId: string, formData: FormData) {
  await verifySession();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: { tasks: { orderBy: [{ batchIndex: "asc" }, { createdAt: "asc" }] } },
  });
  if (project.tasks.length === 0) return;

  await prisma.projectTemplate.create({
    data: {
      name,
      tasks: {
        create: project.tasks.map((t, i) => ({
          title: t.title,
          order: i,
          energy: t.energy,
          context: t.context,
          estimatedMinutes: t.estimatedMinutes,
        })),
      },
    },
  });

  revalidatePath("/clients");
}

export async function createProjectFromTemplate(clientId: string, formData: FormData) {
  await verifySession();
  const name = String(formData.get("name") ?? "").trim();
  const templateId = String(formData.get("templateId") ?? "").trim();
  if (!name || !templateId) return;

  const template = await prisma.projectTemplate.findUniqueOrThrow({
    where: { id: templateId },
    include: { tasks: { orderBy: { order: "asc" } } },
  });

  const project = await prisma.project.create({ data: { name, clientId } });

  const total = template.tasks.length;
  await prisma.task.createMany({
    data: template.tasks.map((t) => ({
      title: t.title,
      projectId: project.id,
      state: "later",
      energy: t.energy,
      context: t.context,
      estimatedMinutes: t.estimatedMinutes,
      // Mirrors the seeded "batch N of total" pattern only when the
      // template actually has more than one task — a single-task
      // template has no batch to number.
      batchIndex: total > 1 ? t.order + 1 : null,
      batchTotal: total > 1 ? total : null,
    })),
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
}
