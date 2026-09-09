"use server";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

// Quick-jump search (DESIGN.md §11.2) — fuzzy-ish substring match across
// Clients/Projects/Tasks/email threads. Deliberately not a data-entry
// form: this is for finding and jumping, not typing structured data
// under time pressure (that's what Capture is for).

export type SearchResult = { id: string; label: string; clientId: string | null };
export type SearchResults = {
  clients: SearchResult[];
  projects: SearchResult[];
  tasks: SearchResult[];
  threads: SearchResult[];
};

const EMPTY: SearchResults = { clients: [], projects: [], tasks: [], threads: [] };

export async function searchAll(query: string): Promise<SearchResults> {
  await verifySession();
  const q = query.trim();
  if (q.length < 2) return EMPTY;

  const [clients, projects, tasks, threads] = await Promise.all([
    prisma.client.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      take: 5,
      orderBy: { name: "asc" },
    }),
    prisma.project.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      take: 5,
      orderBy: { name: "asc" },
    }),
    prisma.task.findMany({
      where: { title: { contains: q, mode: "insensitive" } },
      take: 6,
      orderBy: { createdAt: "desc" },
      include: { project: true },
    }),
    prisma.emailThread.findMany({
      where: { subject: { contains: q, mode: "insensitive" } },
      take: 5,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    clients: clients.map((c) => ({ id: c.id, label: c.name, clientId: c.id })),
    projects: projects.map((p) => ({ id: p.id, label: p.name, clientId: p.clientId })),
    tasks: tasks.map((t) => ({ id: t.id, label: t.title, clientId: t.project?.clientId ?? null })),
    threads: threads.map((t) => ({ id: t.id, label: t.subject, clientId: t.clientId })),
  };
}

// The one task Focus is currently showing as "next" (no energy filter) —
// what the palette's "mark done" quick action operates on, so it matches
// exactly what tapping the checkbox on Focus would do.
export async function getCurrentNextTask() {
  await verifySession();
  const deadlineTask = await prisma.task.findFirst({
    where: { state: { not: "done" }, dueDate: { lte: new Date(Date.now() + 24 * 60 * 60 * 1000) } },
    orderBy: { dueDate: "asc" },
  });
  const nextTask = await prisma.task.findFirst({
    where: { state: "next", id: deadlineTask ? { not: deadlineTask.id } : undefined },
    orderBy: { createdAt: "asc" },
  });
  return nextTask ? { id: nextTask.id, title: nextTask.title } : null;
}
