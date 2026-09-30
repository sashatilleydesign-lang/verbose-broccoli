"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import {
  subscribe,
  getSnapshot,
  getServerSnapshot,
  closeTaskEdit,
  type EditTarget,
} from "@/components/taskEditStore";
import { updateTaskMeta } from "@/app/actions/tasks";
import { dateKey } from "@/lib/scheduleFormat";

export function TaskEditModal() {
  const active = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (!active) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeTaskEdit();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active]);

  if (!active) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,black_45%,transparent)] p-4 overflow-y-auto"
      onClick={closeTaskEdit}
    >
      {/* Keyed on task id so switching tasks remounts with fresh draft state */}
      <TaskEditor key={active.id} target={active} />
    </div>
  );
}

function TaskEditor({ target }: { target: EditTarget }) {
  const [state, setState] = useState(target.state);
  const [energy, setEnergy] = useState(target.energy);
  const [context, setContext] = useState(target.context);
  const [estimate, setEstimate] = useState(
    target.estimatedMinutes !== null ? String(target.estimatedMinutes) : ""
  );
  const [dueDate, setDueDate] = useState(target.dueDate ? dateKey(target.dueDate) : "");
  const [deadlineType, setDeadlineType] = useState<"hard" | "soft" | null>(target.deadlineType);
  const [, startTransition] = useTransition();

  function handleSave() {
    const dueDateMs = dueDate ? new Date(`${dueDate}T00:00:00`).getTime() : null;
    const estimatedMinutes = estimate ? Math.max(1, Math.round(Number(estimate))) : null;
    startTransition(() => {
      updateTaskMeta(
        target.id,
        state,
        energy,
        context,
        estimatedMinutes,
        dueDateMs,
        dueDateMs ? (deadlineType ?? "soft") : null
      );
    });
    closeTaskEdit();
  }

  // Cmd+Enter / Ctrl+Enter to save — re-registered whenever form state changes
  // so the handler always closes over the latest values.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleSave();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state, energy, context, estimate, dueDate, deadlineType]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleDueDateChange(value: string) {
    setDueDate(value);
    if (!value) setDeadlineType(null);
  }

  return (
    <div
      className="shadow-panel my-auto w-full max-w-lg rounded-md border border-line bg-panel p-5"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="mb-1 text-[11px] font-bold tracking-wide text-ink-dim uppercase">Edit task</p>
      <p className="mb-5 text-[16px] font-bold leading-snug">{target.title}</p>

      {/* Status */}
      <div className="mb-4">
        <p className="mb-1.5 text-[11px] font-bold tracking-wide text-ink-dim uppercase">Status</p>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { value: "next", label: "Next up" },
              { value: "later", label: "Later" },
              { value: "stuck", label: "Stuck" },
              { value: "waiting", label: "Waiting on" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setState(opt.value)}
              className={
                "min-h-8 rounded-md border px-3 py-1.5 text-[12px] font-bold transition " +
                (state === opt.value
                  ? "border-accent bg-accent text-ground"
                  : "border-line bg-ground text-ink-dim hover:border-ink-dim hover:text-ink")
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Energy */}
      <div className="mb-4">
        <p className="mb-1.5 text-[11px] font-bold tracking-wide text-ink-dim uppercase">Energy</p>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { value: null, label: "Any" },
              { value: "low", label: "Low" },
              { value: "medium", label: "Medium" },
              { value: "high", label: "High" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setEnergy(opt.value)}
              className={
                "min-h-8 rounded-md border px-3 py-1.5 text-[12px] font-bold capitalize transition " +
                (energy === opt.value
                  ? "border-accent bg-accent text-ground"
                  : "border-line bg-ground text-ink-dim hover:border-ink-dim hover:text-ink")
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Context */}
      <div className="mb-4">
        <p className="mb-1.5 text-[11px] font-bold tracking-wide text-ink-dim uppercase">Context</p>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { value: null, label: "Any" },
              { value: "email", label: "Email" },
              { value: "calls", label: "Calls" },
              { value: "deep_work", label: "Deep work" },
              { value: "admin", label: "Admin" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setContext(opt.value)}
              className={
                "min-h-8 rounded-md border px-3 py-1.5 text-[12px] font-bold transition " +
                (context === opt.value
                  ? "border-accent bg-accent text-ground"
                  : "border-line bg-ground text-ink-dim hover:border-ink-dim hover:text-ink")
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Estimate */}
      <div className="mb-4">
        <label
          htmlFor="task-edit-estimate"
          className="mb-1.5 block text-[11px] font-bold tracking-wide text-ink-dim uppercase"
        >
          Estimate (minutes)
        </label>
        <input
          id="task-edit-estimate"
          type="number"
          min="1"
          value={estimate}
          onChange={(e) => setEstimate(e.target.value)}
          placeholder="e.g. 30"
          className="min-h-9 w-32 rounded-md border border-line bg-ground px-3 py-1.5 text-[14px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
      </div>

      {/* Due date */}
      <div className="mb-5">
        <label
          htmlFor="task-edit-due"
          className="mb-1.5 block text-[11px] font-bold tracking-wide text-ink-dim uppercase"
        >
          Due date
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <input
            id="task-edit-due"
            type="date"
            value={dueDate}
            onChange={(e) => handleDueDateChange(e.target.value)}
            className="min-h-9 rounded-md border border-line bg-ground px-3 py-1.5 text-[13px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
          {dueDate ? (
            <>
              <div className="flex gap-2">
                {(["soft", "hard"] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDeadlineType(d)}
                    className={
                      "min-h-8 rounded-md border px-3 py-1.5 text-[12px] font-bold capitalize transition " +
                      ((deadlineType ?? "soft") === d
                        ? "border-accent bg-accent text-ground"
                        : "border-line bg-ground text-ink-dim hover:border-ink-dim hover:text-ink")
                    }
                  >
                    {d}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => handleDueDateChange("")}
                className="text-[12px] font-bold text-ink-dim hover:text-ink"
              >
                Clear
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[11px] text-ink-dim">⌘↩ to save</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={closeTaskEdit}
            className="min-h-9 rounded-md border border-line px-4 text-[13px] font-semibold text-ink-dim hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="min-h-9 rounded-md bg-accent px-4 text-[13px] font-semibold text-ground hover:opacity-90"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
