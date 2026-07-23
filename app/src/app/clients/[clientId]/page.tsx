import { notFound } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { ExpandableLater } from "@/components/ExpandableLater";

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

  const entries: TimelineEntry[] = [];
  const laterTasks: { id: string; title: string }[] = [];

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
      } else if (task.state === "later") {
        laterTasks.push({ id: task.id, title: task.title });
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
          <h1 className="text-xl font-bold">{client.name}</h1>
        </div>
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

        <div className="mt-5 ml-1.5 pl-6">
          <ExpandableLater tasks={laterTasks} />
        </div>
      </div>
    </AppShell>
  );
}
