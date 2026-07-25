"use client";

import { openTaskNote } from "@/components/taskNoteStore";

// Makes a task's title clickable to open its note (§11.9) — Task.note
// has existed since the schema's first draft, but nothing surfaced it
// until now. Deliberately plain/inline-looking rather than button-styled
// so it doesn't visually compete with the title everywhere it's used;
// the hover underline is the only affordance.
export function TaskTitleButton({
  task,
  className = "",
}: {
  task: { id: string; title: string; note: string | null };
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => openTaskNote(task)}
      className={`text-left hover:underline ${className}`}
    >
      {task.title}
    </button>
  );
}
