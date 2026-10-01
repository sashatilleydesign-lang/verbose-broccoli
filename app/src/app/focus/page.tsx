import Link from "next/link";
import { verifySession } from "@/lib/dal";
import { getFocusData } from "@/lib/focus";
import { AppShell } from "@/components/AppShell";
import { CompleteTaskButton } from "@/components/CompleteTaskButton";
import { SessionOverlay } from "@/components/SessionOverlay";
import { ClientBadge } from "@/components/ClientBadge";
import { TaskTitleButton } from "@/components/TaskTitleButton";
import { archiveThread, convertThreadToTask } from "@/app/actions/emails";
import { relativePast, relativeDeadline, relativeTarget } from "@/lib/format";
import { EditTaskButton } from "@/components/EditTaskButton";

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
        <p className="font-mono-strobe mb-2 flex items-center gap-2 text-[10.5px] font-semibold tracking-wide text-accent uppercase">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
          Right now
        </p>
        <p className="font-reading mb-4 max-w-[56ch] text-[18px] leading-relaxed text-ink-dim">{subtitle}</p>
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
                  "min-h-8 rounded-2xl border px-3 py-1.5 text-[12px] font-bold transition " +
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
        <div className="shadow-panel mb-8 rounded-2xl border border-line bg-panel p-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {nextTask.project?.client ? (
              <ClientBadge name={nextTask.project.client.name} colorTag={nextTask.project.client.colorTag} />
            ) : null}
            {nextTask.energy ? (
              <span className="font-mono-strobe rounded border border-line px-2 py-0.5 text-[10.5px] font-semibold uppercase text-ink-dim">
                {nextTask.energy} energy
              </span>
            ) : null}
            {nextTask.context ? (
              <span className="font-mono-strobe rounded border border-line px-2 py-0.5 text-[10.5px] font-semibold uppercase text-ink-dim">
                {nextTask.context.replace("_", " ")}
              </span>
            ) : null}
          </div>

          <div className="mb-2 flex items-start gap-4">
            <CompleteTaskButton key={nextTask.id} taskId={nextTask.id} />
            <TaskTitleButton task={nextTask} className="font-display block text-[38px] leading-[1.08] text-ink" />
          </div>

          <p className="mb-5 ml-12 text-[13.5px] text-ink-dim">
            {nextTask.estimatedMinutes ? `~${nextTask.estimatedMinutes} min` : "No estimate"}
            {nextTask.targetDate ? (
              <span className="text-accent"> · Your target: {relativeTarget(nextTask.targetDate)}</span>
            ) : null}
            {batchProgress ? (
              <span className="text-ink-dim"> · {batchProgress.done} of {batchProgress.total} in batch</span>
            ) : null}
          </p>

          {batchProgress ? (
            <div className="mb-5 ml-12 flex gap-1.5" aria-hidden="true">
              {Array.from({ length: batchProgress.total }, (_, i) => {
                const idx = i + 1;
                const isDone = idx <= batchProgress.done;
                const isCurrent = idx === batchProgress.done + 1;
                return (
                  <span
                    key={idx}
                    className={
                      "h-1.5 w-4 rounded-full " +
                      (isDone ? "bg-accent opacity-40" : isCurrent ? "bg-accent" : "bg-line")
                    }
                  />
                );
              })}
            </div>
          ) : null}

          <div className="ml-12 flex flex-wrap items-center gap-3">
            <SessionOverlay
              task={{
                id: nextTask.id,
                title: nextTask.title,
                estimatedMinutes: nextTask.estimatedMinutes,
                startedAt: nextTask.startedAt,
              }}
            />
            <EditTaskButton
              task={{
                id: nextTask.id,
                title: nextTask.title,
                state: "next",
                energy: nextTask.energy as "low" | "medium" | "high" | null,
                context: nextTask.context as "email" | "calls" | "deep_work" | "admin" | null,
                estimatedMinutes: nextTask.estimatedMinutes,
                dueDate: nextTask.dueDate ?? null,
                deadlineType: nextTask.deadlineType as "hard" | "soft" | null,
              }}
            />
          </div>
        </div>
      ) : null}

      {emailThread || deadlineTask ? (
        <p className="mb-2 text-[11.5px] font-bold tracking-wide text-ink-dim uppercase">Also worth knowing</p>
      ) : null}

      <div className="shadow-panel rounded-2xl border border-line bg-panel">
        {emailThread && email ? (
          <div className="flex gap-4 border-b border-line p-4">
            <div className="flex h-9 w-9 flex-none items-center justify-center rounded-2xl border border-line text-[12px] font-extrabold text-ink-dim">
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
            <CompleteTaskButton key={deadlineTask.id} taskId={deadlineTask.id} />
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
              <p className="mb-2 text-[13.5px] text-ink-dim capitalize">
                {deadlineTask.dueDate ? relativeDeadline(deadlineTask.dueDate) : null}
                {deadlineTask.targetDate ? (
                  <span className="text-accent normal-case"> · 🎯 your target: {relativeTarget(deadlineTask.targetDate)}</span>
                ) : null}
              </p>
              <EditTaskButton
                task={{
                  id: deadlineTask.id,
                  title: deadlineTask.title,
                  state: deadlineTask.state as "next" | "later" | "stuck" | "waiting",
                  energy: deadlineTask.energy as "low" | "medium" | "high" | null,
                  context: deadlineTask.context as "email" | "calls" | "deep_work" | "admin" | null,
                  estimatedMinutes: deadlineTask.estimatedMinutes,
                  dueDate: deadlineTask.dueDate ?? null,
                  deadlineType: deadlineTask.deadlineType as "hard" | "soft" | null,
                }}
              />
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
