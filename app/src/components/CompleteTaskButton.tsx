"use client";

import { useState, useTransition } from "react";
import { completeTask } from "@/app/actions/tasks";

export function CompleteTaskButton({ taskId, size = "big" }: { taskId: string; size?: "big" | "small" }) {
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const dims = size === "big" ? "h-8.5 w-8.5" : "h-7 w-7";

  return (
    <button
      type="button"
      aria-label={done ? "Task completed" : "Mark task done"}
      disabled={pending || done}
      onClick={() => {
        setDone(true);
        startTransition(() => {
          completeTask(taskId);
        });
      }}
      className={
        `${dims} flex flex-none items-center justify-center rounded-md border-2 transition ` +
        (done ? "border-accent bg-accent" : "border-accent bg-transparent hover:bg-accent/10")
      }
    >
      {done ? <span className="text-sm font-black text-ground">✓</span> : null}
    </button>
  );
}
