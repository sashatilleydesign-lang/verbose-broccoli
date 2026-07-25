"use client";

import { useEffect, useState, useTransition } from "react";
import { startSession, endSession, completeTask } from "@/app/actions/tasks";

const DEFAULT_MINUTES = 25;

type Task = { id: string; title: string; estimatedMinutes: number | null; startedAt: Date | null };

function formatClock(totalSeconds: number) {
  const sign = totalSeconds < 0 ? "+" : "";
  const abs = Math.abs(totalSeconds);
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  return `${sign}${m}:${String(s).padStart(2, "0")}`;
}

export function SessionOverlay({ task }: { task: Task }) {
  const [, startTransition] = useTransition();
  const [now, setNow] = useState(() => Date.now());
  const [nudgeDismissed, setNudgeDismissed] = useState(false);

  useEffect(() => {
    if (!task.startedAt) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [task.startedAt]);

  if (!task.startedAt) {
    return (
      <form action={startSession.bind(null, task.id)}>
        <button
          type="submit"
          className="min-h-9 rounded-md border border-line px-3 text-[12.5px] font-semibold text-ink-dim hover:text-ink"
        >
          Start focus session
        </button>
      </form>
    );
  }

  const durationSeconds = (task.estimatedMinutes ?? DEFAULT_MINUTES) * 60;
  const elapsedSeconds = Math.floor((now - task.startedAt.getTime()) / 1000);
  const remaining = durationSeconds - elapsedSeconds;
  const timeUp = remaining <= 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ground px-6">
      <p className="mb-3 text-[12px] font-bold tracking-wide text-ink-dim uppercase">Focus session</p>
      <p className="mb-8 max-w-lg text-center text-[22px] font-bold leading-snug">{task.title}</p>
      <p className={`font-mono-strobe mb-10 text-[56px] font-bold ${timeUp ? "text-ink-dim" : "text-ink"}`}>
        {formatClock(remaining)}
      </p>

      {timeUp && !nudgeDismissed ? (
        <div className="shadow-panel mb-8 flex items-center gap-3 rounded-md border border-line bg-panel px-4 py-3">
          <p className="text-[13.5px] text-ink-dim">Time&apos;s up — take a break if you need one, or keep going.</p>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setNudgeDismissed(true)}
            className="text-[13px] font-bold text-ink-dim hover:text-ink"
          >
            ✕
          </button>
        </div>
      ) : null}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => startTransition(() => completeTask(task.id))}
          className="min-h-11 rounded-md bg-accent px-5 text-[13.5px] font-semibold text-ground hover:opacity-90"
        >
          Done
        </button>
        <button
          type="button"
          onClick={() => startTransition(() => endSession(task.id))}
          className="min-h-11 rounded-md border border-line px-5 text-[13.5px] font-semibold text-ink-dim hover:text-ink"
        >
          End session
        </button>
      </div>
    </div>
  );
}
