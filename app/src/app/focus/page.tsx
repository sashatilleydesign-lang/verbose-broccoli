import Link from "next/link";
import { verifySession } from "@/lib/dal";
import { getFocusData } from "@/lib/focus";
import { AppShell } from "@/components/AppShell";
import { CompleteTaskButton } from "@/components/CompleteTaskButton";
import { SessionOverlay } from "@/components/SessionOverlay";
import { ClientBadge } from "@/components/ClientBadge";
import { TaskTitleButton } from "@/components/TaskTitleButton";
import { archiveThread, convertThreadToTask } from "@/app/actions/emails";
import { relativePast, relativeDeadline } from "@/lib/format";

const ENERGY_OPTIONS = [
  { value: undefined, label: "All" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
] as const;

export default async function FocusPage({
  searchParams,
}: {
  searchParams: Promise<{ energy?: string }>;
}) {
  await verifySession();
  const { energy } = await searchParams;
  const energyFilter = energy === "low" || energy === "medium" || energy === "high" ? energy : undefined;
  const { nextTask, batchProgress, deadlineTask, emailThread } = await getFocusData(energyFilter);
  const email = emailThread?.messages[0];

  const itemCount = [nextTask, deadlineTask, emailThread].filter(Boolean).length;

  let subtitle: string;
  if (energyFilter && !nextTask) {
    subtitle = "Nothing pinned at that energy level right now.";
  } else if (itemCount > 0) {
    subtitle = "Three things, at most. Everything else exists — just not on this screen.";
  } else {
    subtitle = "Nothing pinned right now. Capture something, or check Workspace for what's open.";
  }

  return (
    <AppShell>
      <div className="mb-6">
        <p className="mb-2 text-[11.5px] font-bold tracking-wide text-accent uppercase">Right now</p>
        <p className="mb-4 max-w-[64ch] text-[15.5px] leading-relaxed text-ink-dim">{subtitle}</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold tracking-wide text-ink-dim uppercase">Energy today:</span>
          {ENERGY_OPTIONS.map((opt) => {
            const active = opt.value === energyFilter;
            const href = opt.value ? `/focus?energy=${opt.value}` : "/focus";
            return (
              <Link
                key={opt.label}
                href={href}
                className={
                  "min-h-8 rounded-md border px-3 py-1.5 text-[12px] font-bold transition " +
                  (active
                    ? "border-accent bg-accent text-ground"
                    : "border-line bg-panel text-ink-dim hover:text-ink hover:border-ink-dim")
                }
              >
                {opt.label}
              </Link>
            );
          })}
        </div>
      </div>

      {nextTask ? (
        <div className="shadow-panel mb-8 flex gap-4 rounded-md border border-line border-l-3 border-l-accent bg-panel p-5">
          <CompleteTaskButton key={nextTask.id} taskId={nextTask.id} />
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              {nextTask.project?.client ? (
                <ClientBadge name={nextTask.project.client.name} colorTag={nextTask.project.client.colorTag} />
              ) : null}
              {nextTask.energy ? (
                <span className="text-[13.5px] text-ink-dim">{nextTask.energy} energy</span>
              ) : null}
            </div>
            <TaskTitleButton task={nextTask} className="mb-1.5 block text-[20px] leading-snug font-bold" />
            <p className="mb-2.5 text-[13.5px] text-ink-dim">
              {nextTask.estimatedMinutes ? `~${nextTask.estimatedMinutes} min estimated` : "No estimate yet"}
            </p>
            <SessionOverlay
              task={{
                id: nextTask.id,
                title: nextTask.title,
                estimatedMinutes: nextTask.estimatedMinutes,
                startedAt: nextTask.startedAt,
              }}
            />
            {batchProgress ? (
              <div className="mt-3 flex gap-1.5" aria-hidden="true">
                {Array.from({ length: batchProgress.total }, (_, i) => {
                  const idx = i + 1;
                  const isDone = idx <= batchProgress.done;
                  const isCurrent = idx === batchProgress.done + 1;
                  return (
                    <span
                      key={idx}
                      className={
                        "h-2 w-2 rounded-full " +
                        (isDone ? "bg-accent-dim" : isCurrent ? "bg-accent shadow-[0_0_6px_var(--accent)]" : "bg-line")
                      }
                    />
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {emailThread || deadlineTask ? (
        <p className="mb-2 text-[11.5px] font-bold tracking-wide text-ink-dim uppercase">Also worth knowing</p>
      ) : null}

      <div className="shadow-panel rounded-md border border-line bg-panel">
        {emailThread && email ? (
          <div className="flex gap-4 border-b border-line p-4">
            <div className="flex h-9 w-9 flex-none items-center justify-center rounded-md border border-line text-[12px] font-extrabold text-ink-dim">
              {email.fromName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                {emailThread.client ? (
                  <ClientBadge name={emailThread.client.name} colorTag={emailThread.client.colorTag} />
                ) : null}
                <span className="font-mono-strobe text-[13px] text-ink-dim">
                  unread · {relativePast(email.receivedAt)}
                </span>
              </div>
              <p className="mb-1 text-[15px] font-semibold">{emailThread.subject}</p>
              <p className="text-[13.5px] text-ink-dim">&ldquo;{email.snippet}&rdquo;</p>
              <div className="mt-2.5 flex gap-4">
                <form action={convertThreadToTask.bind(null, emailThread.id)}>
                  <button type="submit" className="border-b border-line pb-0.5 text-[12.5px] font-bold text-ink-dim hover:border-accent hover:text-accent">
                    Turn into task
                  </button>
                </form>
                <form action={archiveThread.bind(null, emailThread.id)}>
                  <button type="submit" className="border-b border-line pb-0.5 text-[12.5px] font-bold text-ink-dim hover:border-accent hover:text-accent">
                    Archive
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : null}

        {deadlineTask ? (
          <div className="flex gap-4 p-4">
            <div className="h-8.5 w-8.5 flex-none rounded-md border-2 border-dashed border-accent" />
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                {deadlineTask.project?.client ? (
                  <ClientBadge name={deadlineTask.project.client.name} colorTag={deadlineTask.project.client.colorTag} />
                ) : null}
                {deadlineTask.deadlineType === "hard" ? (
                  <span className="rounded border border-ink-dim px-2 py-1 text-[11px] font-bold text-ink">
                    ⚠ HARD DEADLINE
                  </span>
                ) : null}
              </div>
              <TaskTitleButton task={deadlineTask} className="mb-1 block text-[15px] font-semibold" />
              <p className="text-[13.5px] text-ink-dim capitalize">
                {deadlineTask.dueDate ? relativeDeadline(deadlineTask.dueDate) : null}
              </p>
            </div>
          </div>
        ) : null}

        {!emailThread && !deadlineTask ? (
          <p className="p-5 text-[13.5px] text-ink-dim">Nothing else needs your attention right now.</p>
        ) : null}
      </div>
    </AppShell>
  );
}
