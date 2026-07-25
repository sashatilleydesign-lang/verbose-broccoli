import { verifySession } from "@/lib/dal";
import { getWeeklyReviewData } from "@/lib/weekly";
import { AppShell } from "@/components/AppShell";
import { markAsNext, touchTask } from "@/app/actions/weekly";
import { daysSince } from "@/lib/format";
import { ClientBadge } from "@/components/ClientBadge";

export default async function WeeklyReviewPage() {
  await verifySession();
  const { stuck, waiting, noNextAction } = await getWeeklyReviewData();
  const total = stuck.length + waiting.length + noNextAction.length;

  return (
    <AppShell>
      <div className="mb-6">
        <p className="mb-2 text-[11.5px] font-bold tracking-wide text-accent uppercase">Weekly review</p>
        <p className="max-w-[64ch] text-[15.5px] leading-relaxed text-ink-dim">
          {total > 0
            ? "A guided pass, not a demand. Nothing here is due right now — it's just been waiting for a decision."
            : "Nothing waiting for a decision. Everything either has a next action or isn't stuck."}
        </p>
      </div>

      {stuck.length > 0 ? (
        <section className="mb-8">
          <p className="mb-3 text-[11.5px] font-bold tracking-wide text-ink-dim uppercase">
            Stuck — flagged, not nagged
          </p>
          <div className="shadow-panel divide-y divide-line rounded-md border border-line bg-panel">
            {stuck.map((task) => (
              <div key={task.id} className="flex flex-wrap items-center gap-4 p-4">
                <div className="min-w-[220px] flex-1 text-[14.5px]">
                  {task.project?.client ? (
                    <ClientBadge name={task.project.client.name} colorTag={task.project.client.colorTag} className="mr-2" />
                  ) : null}
                  <strong className="font-semibold">{task.title}</strong>
                  <span className="mt-0.5 block text-[12.5px] text-ink-dim">
                    flagged {daysSince(task.updatedAt)} day{daysSince(task.updatedAt) === 1 ? "" : "s"} ago
                  </span>
                </div>
                <div className="flex gap-4">
                  <form action={markAsNext.bind(null, task.id)}>
                    <button type="submit" className="min-h-8 rounded-md border border-accent px-3 text-[12px] font-bold text-accent hover:bg-accent hover:text-ground">
                      Make it next
                    </button>
                  </form>
                  <form action={touchTask.bind(null, task.id)}>
                    <button type="submit" className="border-b border-line pb-0.5 text-[12px] font-bold text-ink-dim hover:border-ink-dim hover:text-ink">
                      Snooze a week
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {waiting.length > 0 ? (
        <section className="mb-8">
          <p className="mb-3 text-[11.5px] font-bold tracking-wide text-ink-dim uppercase">
            Waiting on someone else
          </p>
          <div className="shadow-panel divide-y divide-line rounded-md border border-line bg-panel">
            {waiting.map((task) => (
              <div key={task.id} className="flex flex-wrap items-center gap-4 p-4">
                <div className="min-w-[220px] flex-1 text-[14.5px]">
                  {task.project?.client ? (
                    <ClientBadge name={task.project.client.name} colorTag={task.project.client.colorTag} className="mr-2" />
                  ) : null}
                  <strong className="font-semibold">{task.title}</strong>
                  <span className="mt-0.5 block text-[12.5px] text-ink-dim">
                    waiting {daysSince(task.updatedAt)} day{daysSince(task.updatedAt) === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="flex gap-4">
                  <form action={markAsNext.bind(null, task.id)}>
                    <button type="submit" className="min-h-8 rounded-md border border-accent px-3 text-[12px] font-bold text-accent hover:bg-accent hover:text-ground">
                      Resolved — make next
                    </button>
                  </form>
                  <form action={touchTask.bind(null, task.id)}>
                    <button type="submit" className="border-b border-line pb-0.5 text-[12px] font-bold text-ink-dim hover:border-ink-dim hover:text-ink">
                      Still waiting
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {noNextAction.length > 0 ? (
        <section>
          <p className="mb-3 text-[11.5px] font-bold tracking-wide text-ink-dim uppercase">
            Projects without a next action
          </p>
          <div className="shadow-panel divide-y divide-line rounded-md border border-line bg-panel">
            {noNextAction.map((project) => (
              <div key={project.id} className="flex flex-wrap items-center gap-4 p-4">
                <div className="min-w-[220px] flex-1 text-[14.5px]">
                  {project.client ? (
                    <ClientBadge name={project.client.name} colorTag={project.client.colorTag} className="mr-2" />
                  ) : null}
                  <strong className="font-semibold">{project.name}</strong>
                  <span className="mt-0.5 block text-[12.5px] text-ink-dim">no next action set</span>
                </div>
                {project.tasks[0] ? (
                  <form action={markAsNext.bind(null, project.tasks[0].id)}>
                    <button type="submit" className="min-h-8 rounded-md border border-accent px-3 text-[12px] font-bold text-accent hover:bg-accent hover:text-ground">
                      Set next action
                    </button>
                  </form>
                ) : (
                  <span className="text-[12.5px] text-ink-dim">no tasks yet</span>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}
