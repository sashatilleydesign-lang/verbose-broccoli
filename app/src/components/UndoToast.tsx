"use client";

import { useEffect, useSyncExternalStore } from "react";
import { subscribe, getSnapshot, getServerSnapshot, dismissUndo } from "@/components/undoStore";

const AUTO_DISMISS_MS = 6_000;

export function UndoToast() {
  const active = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => dismissUndo(active.toastId), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [active]);

  if (!active) return null;

  return (
    <div className="fixed bottom-4 left-4 z-40 md:left-[248px]">
      <div className="shadow-panel flex items-center gap-4 rounded-md border border-line bg-panel px-4 py-3">
        <p className="text-[13.5px] text-ink">{active.message}</p>
        <button
          type="button"
          onClick={() => {
            active.onUndo();
            dismissUndo(active.toastId);
          }}
          className="text-[12.5px] font-bold text-accent hover:underline"
        >
          Undo
        </button>
      </div>
    </div>
  );
}
