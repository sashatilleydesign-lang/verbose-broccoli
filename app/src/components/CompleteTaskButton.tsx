"use client";

import { useState, useTransition } from "react";
import { completeTask, undoCompleteTask } from "@/app/actions/tasks";
import { showUndo } from "@/components/undoStore";

export function CompleteTaskButton({ taskId }: { taskId: string }) {
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-label={done ? "Task completed" : "Mark task done"}
      disabled={pending || done}
      onClick={() => {
        setDone(true);
        startTransition(async () => {
          const undo = await completeTask(taskId);
          showUndo({
            message: "Task completed.",
            onUndo: () => undoCompleteTask(taskId, undo),
          });
        });
      }}
      className={
        "h-8.5 w-8.5 flex flex-none items-center justify-center rounded-md border-2 transition " +
        (done ? "border-accent bg-accent" : "border-accent bg-transparent hover:bg-accent/10")
      }
    >
      {done ? <span className="text-sm font-black text-ground">✓</span> : null}
    </button>
  );
}
