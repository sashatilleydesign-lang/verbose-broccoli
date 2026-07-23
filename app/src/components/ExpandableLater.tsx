"use client";

import { useState } from "react";

type LaterTask = { id: string; title: string };

export function ExpandableLater({ tasks }: { tasks: LaterTask[] }) {
  const [open, setOpen] = useState(false);
  if (tasks.length === 0) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="min-h-10 rounded-md border border-dashed border-line px-4 py-2.5 text-[13px] font-bold text-ink-dim hover:border-accent hover:text-ink"
      >
        {open ? "– hide the rest" : `+ ${tasks.length} more, not next yet — show them`}
      </button>
      {open ? (
        <ul className="mt-3 space-y-2">
          {tasks.map((t) => (
            <li key={t.id} className="text-[14px] text-ink-dim">
              {t.title}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
