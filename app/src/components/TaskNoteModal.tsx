"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { subscribe, getSnapshot, getServerSnapshot, closeTaskNote, type NoteTarget } from "@/components/taskNoteStore";
import { updateTaskNote } from "@/app/actions/tasks";

export function TaskNoteModal() {
  const active = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (!active) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeTaskNote();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active]);

  if (!active) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,black_45%,transparent)] p-4"
      onClick={closeTaskNote}
    >
      {/* Keyed on the task id so switching between two tasks' notes
          remounts this with a fresh lazy-initialized draft, instead of
          needing an effect to re-seed state from a changing prop. */}
      <NoteEditor key={active.id} target={active} />
    </div>
  );
}

function NoteEditor({ target }: { target: NoteTarget }) {
  const [draft, setDraft] = useState(() => target.note ?? "");
  const [, startTransition] = useTransition();

  function handleSave() {
    startTransition(() => {
      updateTaskNote(target.id, draft);
    });
    closeTaskNote();
  }

  return (
    <div
      className="shadow-panel w-full max-w-lg rounded-md border border-line bg-panel p-5"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="mb-1 text-[11px] font-bold tracking-wide text-ink-dim uppercase">Note</p>
      <p className="mb-3 text-[16px] font-bold leading-snug">{target.title}</p>
      <textarea
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Nothing written yet — add context, a brief, or anything worth remembering about this task."
        rows={8}
        className="min-h-32 w-full resize-y rounded-md border border-line bg-ground p-3 text-[14px] leading-relaxed text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent"
      />
      <div className="mt-3 flex justify-end gap-3">
        <button
          type="button"
          onClick={closeTaskNote}
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
  );
}
