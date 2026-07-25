"use client";

import { useTransition } from "react";
import { discardCaptureItem, restoreCaptureItem } from "@/app/actions/captures";
import { showUndo } from "@/components/undoStore";

export function DiscardCaptureButton({ item }: { item: { id: string; text: string } }) {
  const [, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => {
        startTransition(() => {
          discardCaptureItem(item.id);
        });
        showUndo({
          message: "Discarded.",
          onUndo: () => restoreCaptureItem(item.text),
        });
      }}
      className="border-b border-line pb-0.5 text-[12.5px] font-bold text-ink-dim hover:border-accent hover:text-accent"
    >
      Discard
    </button>
  );
}
