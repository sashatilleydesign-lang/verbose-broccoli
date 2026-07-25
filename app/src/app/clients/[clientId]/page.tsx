import { notFound } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { ExpandableLater } from "@/components/ExpandableLater";
import { createProject, createTask } from "@/app/actions/entities";
import { saveProjectAsTemplate, createProjectFromTemplate } from "@/app/actions/templates";
import { ClientDot } from "@/components/ClientBadge";
import { ClientProfileCard } from "@/components/ClientProfileCard";

type TimelineEntry = {
  kind: "email" | "done" | "next";
  date: Date;
  title: string;
  detail?: string;
};

export default async function ClientWorkspacePage({ params }: { params: Promise<{ clientId: string }> }) {
  await verifySession();
  const { clientId } = await params;

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      projects: { include: { tasks: true, nextAction: true } },
      threads: { include: { messages: true } },
    },
  });

  if (!client) notFound();

  const templates = await prisma.projectTemplate.findMany({
    include: { _count: { select: { tasks: true } } },
    orderBy: { createdAt: "desc" },
  });

  const entries: TimelineEntry[] = [];

  for (const thread of client.threads) {
    for (const message of thread.messages) {
      entries.push({
        kind: "email",
        date: message.receivedAt,
        title: `"${message.snippet}"`,
        detail: thread.subject,
      });
    }
  }

  for (const project of client.projects) {
    for (const task of project.tasks) {
      if (task.state === "done" && task.completedAt) {
        entries.push({ kind: "done", date: task.completedAt, title: task.title });
      } else if (task.state === "next") {
        entries.push({ kind: "next", date: task.createdAt, title: task.title });
      }
    }
  }

  entries.sort((a, b) => a.date.getTime() - b.date.getTime());

  const pinnedNext = client.projects.find((p) => p.nextAction)?.nextAction;

  return (
    <AppShell>
      <div className="mb-6">
        <p className="mb-2 text-[11.5px] font-bold tracking-wide text-accent uppercase">Client workspace</p>
        <p className="max-w-[64ch] text-[15.5px] leading-relaxed text-ink-dim">
          Every email and every task for this client, in one scroll — not two tabs.
        </p>
      </div>

      <div className="shadow-panel rounded-md border border-line bg-panel p-6">
        <div className="mb-1 flex flex-wrap items-center gap-3">
          <h1 className="flex items-center gap-2.5 text-xl font-bold">
            <ClientDot colorTag={client.colorTag} />
            {client.name}
          </h1>
        </div>
        <ClientProfileCard
          clientId={client.id}
          profile={{
            contactEmail: client.contactEmail,
            contactPhone: client.contactPhone,
            rate: client.rate,
            notes: client.notes,
          }}
        />
        {pinnedNext ? (
          <p className="mb-6 text-[14px] text-ink-dim">
            Pinned next action: <strong className="text-ink">{pinnedNext.title}</strong>
          </p>
        ) : (
          <p className="mb-6 text-[14px] text-ink-dim">No next action set yet.</p>
        )}

        <ol className="ml-1.5 space-y-5 border-l-2 border-line pl-6">
          {entries.map((entry, i) => (
            <li key={i} className="relative">
              <span
                className={
                  "absolute top-1 -left-[27px] h-2.5 w-2.5 rounded-full border-2 " +
                  (entry.kind === "done"
                    ? "border-accent-dim bg-accent-dim"
                    : entry.kind === "next"
                      ? "border-accent bg-accent shadow-[0_0_6px_var(--accent)]"
                      : "border-ink-dim bg-ground")
                }
              />
              <p className="font-mono-strobe mb-0.5 text-[12px] font-semibold text-ink-dim">
                {entry.date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                {entry.kind === "email" ? " · EMAIL" : ""}
              </p>
              <p className="text-[15px] font-semibold">{entry.title}</p>
              {entry.detail ? <p className="text-[13.5px] text-ink-dim">{entry.detail}</p> : null}
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-8">
        <p className="mb-3 text-[11.5px] font-bold tracking-wide text-ink-dim uppercase">Projects</p>

        <form action={createProject.bind(null, client.id)} className="mb-2.5 flex gap-2.5">
          <input
            name="name"
            type="text"
            required
            placeholder="New project name"
            aria-label="New project name"
            className="min-h-11 flex-1 rounded-md border border-line bg-panel px-3.5 py-2.5 text-[14px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
          <button
            type="submit"
            className="min-h-11 rounded-md bg-accent px-4 text-[13px] font-semibold text-ground hover:opacity-90"
          >
            Add
          </button>
        </form>

        {templates.length > 0 ? (
          <form action={createProjectFromTemplate.bind(null, client.id)} className="mb-4 flex flex-wrap gap-2.5">
            <select
              name="templateId"
              required
              aria-label="Project template"
              defaultValue=""
              className="min-h-11 rounded-md border border-line bg-panel px-3 py-2.5 text-[13.5px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <option value="" disabled>
                From template…
              </option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t._count.tasks} tasks)
                </option>
              ))}
            </select>
            <input
              name="name"
              type="text"
              required
              placeholder="New project name"
              aria-label="New project name from template"
              className="min-h-11 flex-1 rounded-md border border-line bg-panel px-3.5 py-2.5 text-[14px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
            <button
              type="submit"
              className="min-h-11 rounded-md border border-line px-4 text-[13px] font-semibold text-ink-dim hover:text-ink"
            >
              Use template
            </button>
          </form>
        ) : null}

        {client.projects.length === 0 ? (
          <p className="text-[13.5px] text-ink-dim">No projects yet.</p>
        ) : (
          <div className="space-y-3">
            {client.projects.map((project) => {
              const otherTasks = project.tasks
                .filter((t) => t.state === "later" || t.state === "stuck" || t.state === "waiting")
                .map((t) => ({
                  id: t.id,
                  // Every task shows up somewhere in the workspace — a
                  // stuck or waiting task doesn't just silently disappear.
                  title: t.state === "later" ? t.title : `${t.title} (${t.state})`,
                  note: t.note,
                  targetDate: t.targetDate,
                }));

              return (
                <div key={project.id} className="shadow-panel rounded-md border border-line bg-panel p-4">
                  <div className="mb-2.5 flex flex-wrap items-center gap-2">
                    <p className="text-[14.5px] font-semibold">{project.name}</p>
                    {project.status !== "active" ? (
                      <span className="rounded border border-line px-2 py-0.5 text-[11px] font-semibold text-ink-dim">
                        {project.status}
                      </span>
                    ) : null}
                  </div>

                  {project.tasks.length > 0 ? (
                    <details className="mb-3">
                      <summary className="cursor-pointer text-[12px] font-bold text-ink-dim hover:text-accent">
                        Save as template
                      </summary>
                      <form action={saveProjectAsTemplate.bind(null, project.id)} className="mt-2 flex gap-2">
                        <input
                          name="name"
                          type="text"
                          required
                          placeholder="Template name"
                          aria-label={`Template name for ${project.name}`}
                          className="min-h-9 flex-1 rounded-md border border-line bg-ground px-3 py-1.5 text-[13.5px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        />
                        <button
                          type="submit"
                          className="min-h-9 rounded-md border border-line px-3 text-[12px] font-semibold text-ink-dim hover:text-ink"
                        >
                          Save
                        </button>
                      </form>
                    </details>
                  ) : null}

                  {otherTasks.length === 0 ? (
                    <p className="mb-3 text-[13px] text-ink-dim">No tasks yet.</p>
                  ) : (
                    <div className="mb-3">
                      <ExpandableLater tasks={otherTasks} />
                    </div>
                  )}

                  <form action={createTask.bind(null, project.id)} className="flex gap-2">
                    <input
                      name="title"
                      type="text"
                      required
                      placeholder="New task"
                      aria-label={`New task for ${project.name}`}
                      className="min-h-9 flex-1 rounded-md border border-line bg-ground px-3 py-1.5 text-[13.5px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    />
                    <button
                      type="submit"
                      className="min-h-9 rounded-md bg-accent px-3 text-[12px] font-semibold text-ground hover:opacity-90"
                    >
                      Add
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
