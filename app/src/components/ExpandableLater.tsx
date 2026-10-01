"use client";

import { useState } from "react";
import { TaskTitleButton } from "@/components/TaskTitleButton";
import { EditTaskButton } from "@/components/EditTaskButton";
import { relativeTarget } from "@/lib/format";

type LaterTask = {
  id: string;
  title: string;
  state: "later" | "stuck" | "waiting";
  note: string | null;
  targetDate: Date | null;
  energy: "low" | "medium" | "high" | null;
  context: "email" | "calls" | "deep_work" | "admin" | null;
  estimatedMinutes: number | null;
  dueDate: Date | null;
  deadlineType: "hard" | "soft" | null;
};

const STATE_LABEL: Record<"later" | "stuck" | "waiting", string | null> = {
  later: null,
  stuck: "stuck",
  waiting: "waiting on",
};

export function ExpandableLater({ tasks }: { tasks: LaterTask[] }) {
  const [open, setOpen] = useState(false);
  if (tasks.length === 0) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="min-h-10 rounded-2xl border border-dashed border-line px-4 py-2.5 text-[13px] font-bold text-ink-dim hover:border-accent hover:text-ink"
      >
        {open ? "– hide the rest" : `+ ${tasks.length} more, not next yet — show them`}
      </button>
      {open ? (
        <ul className="mt-3 space-y-2">
          {tasks.map((t) => (
            <li key={t.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[14px] text-ink-dim">
              <span className="flex items-baseline gap-2">
                <TaskTitleButton task={t} />
                {STATE_LABEL[t.state] ? (
                  <span className="text-[11px] font-bold uppercase tracking-wide text-ink-dim">
                    {STATE_LABEL[t.state]}
                  </span>
                ) : null}
                {t.targetDate ? <span className="text-accent"> · 🎯 {relativeTarget(t.targetDate)}</span> : null}
              </span>
              <EditTaskButton task={t} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
