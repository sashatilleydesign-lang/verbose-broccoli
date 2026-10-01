"use client";

import { useEffect, useState, useTransition } from "react";
import { startSession, endSession, completeTask, undoCompleteTask } from "@/app/actions/tasks";
import { showUndo } from "@/components/undoStore";

const DEFAULT_MINUTES = 25;

type Task = { id: string; title: string; estimatedMinutes: number | null; startedAt: Date | null };

function formatClock(totalSeconds: number) {
  const sign = totalSeconds < 0 ? "+" : "";
  const abs = Math.abs(totalSeconds);
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  return `${sign}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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
          className="inline-flex items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-[13px] font-semibold text-white hover:opacity-90"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
            <path d="M2 1.5L10 6 2 10.5V1.5Z" />
          </svg>
          Start focus session
        </button>
      </form>
    );
  }

  const durationSeconds = (task.estimatedMinutes ?? DEFAULT_MINUTES) * 60;
  const elapsedSeconds = Math.floor((now - task.startedAt.getTime()) / 1000);
  const remaining = durationSeconds - elapsedSeconds;
  const progress = Math.min(elapsedSeconds / durationSeconds, 1);
  const timeUp = remaining <= 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#141210]">
      {/* Header strip */}
      <div className="flex items-center justify-between px-8 py-5">
        <p className="text-[17px] font-semibold text-[#f0ede4]">
          Strobe<span className="text-[#ff5a30]">.</span>
        </p>
        <button
          type="button"
          onClick={() => startTransition(() => endSession(task.id))}
          className="flex items-center gap-2 text-[12px] font-semibold text-[#8a8778] hover:text-[#f0ede4]"
        >
          <kbd className="rounded border border-[rgba(255,255,255,0.15)] px-1.5 py-0.5 font-mono text-[10px]">Esc</kbd>
          end session
        </button>
      </div>

      {/* Main content — vertically centred */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="font-mono-strobe mb-6 text-[10.5px] font-semibold tracking-widest text-[#8a8778] uppercase">
          Focus session
        </p>

        <h1 className="font-display mb-10 max-w-2xl text-[42px] text-[#f0ede4]">{task.title}</h1>

        {/* Countdown */}
        <p className={`font-countdown text-[120px] leading-none tracking-tight ${timeUp ? "text-[#8a8778]" : "text-[#f0ede4]"}`}>
          {formatClock(remaining)}
        </p>

        {/* Progress bar */}
        <div className="mt-6 mb-3 h-px w-80 bg-[rgba(255,255,255,0.12)]">
          <div
            className="h-full bg-[#ff5a30] transition-all duration-1000"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        <p className="font-mono-strobe mb-12 text-[10.5px] text-[#8a8778]">
          LEFT OF {String(task.estimatedMinutes ?? DEFAULT_MINUTES).padStart(2, "0")}:00
        </p>

        {timeUp && !nudgeDismissed ? (
          <div className="mb-8 flex items-center gap-3 rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[#1e1c18] px-4 py-3">
            <p className="text-[13.5px] text-[#8a8778]">Time&apos;s up — take a break, or keep going.</p>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setNudgeDismissed(true)}
              className="text-[13px] font-bold text-[#8a8778] hover:text-[#f0ede4]"
            >
              ✕
            </button>
          </div>
        ) : null}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() =>
              startTransition(async () => {
                const undo = await completeTask(task.id);
                showUndo({ message: "Task completed.", onUndo: () => undoCompleteTask(task.id, undo) });
              })
            }
            className="min-h-11 rounded-2xl bg-[#ff5a30] px-6 text-[13.5px] font-semibold text-white hover:opacity-90"
          >
            ✓ Done
          </button>
          <button
            type="button"
            onClick={() => startTransition(() => endSession(task.id))}
            className="min-h-11 rounded-2xl border border-[rgba(255,255,255,0.15)] px-6 text-[13.5px] font-semibold text-[#8a8778] hover:text-[#f0ede4]"
          >
            End session
          </button>
        </div>
      </div>
    </div>
  );
}
