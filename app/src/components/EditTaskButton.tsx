"use client";

import { openTaskEdit, type EditTarget } from "@/components/taskEditStore";

export function EditTaskButton({ task }: { task: EditTarget }) {
  return (
    <button
      type="button"
      onClick={() => openTaskEdit(task)}
      className="border-b border-line pb-0.5 text-[12px] font-bold text-ink-dim hover:border-ink-dim hover:text-ink"
    >
      Edit
    </button>
  );
}
