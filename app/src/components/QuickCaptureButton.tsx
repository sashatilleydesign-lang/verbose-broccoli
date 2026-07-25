"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createCaptureItem } from "@/app/actions/captures";

// Global quick-capture (§11.13). §2/§5 describe capture as reachable
// from anywhere in under 2 seconds, but what actually got built was a
// fifth nav item — meaning you had to navigate away from whatever
// you're doing before you could drop a thought. This pulls the *input*
// out of the nav into a floating action button present on every screen;
// the Capture page itself still owns reviewing/triaging the list later,
// since that's a deliberate scheduled pass, not something needed
// mid-task.
export function QuickCaptureButton() {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => {
      createCaptureItem(formData);
    });
    setOpen(false);
  }

  return (
    <>
      {open ? (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
      ) : null}
      {open ? (
        <form
          onSubmit={handleSubmit}
          onClick={(e) => e.stopPropagation()}
          className="shadow-panel fixed right-4 bottom-20 z-50 flex w-[min(90vw,360px)] gap-2 rounded-md border border-line bg-panel p-3"
        >
          <input
            ref={inputRef}
            name="text"
            type="text"
            required
            placeholder="Drop a thought…"
            aria-label="Quick capture"
            className="min-h-10 flex-1 rounded-md border border-line bg-ground px-3 py-2 text-[14px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
          <button
            type="submit"
            className="min-h-10 flex-none rounded-md bg-accent px-3.5 text-[13px] font-semibold text-ground hover:opacity-90"
          >
            Drop it
          </button>
        </form>
      ) : null}
      <button
        type="button"
        aria-label={open ? "Close quick capture" : "Quick capture"}
        onClick={() => setOpen((v) => !v)}
        className="shadow-panel fixed right-4 bottom-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-[26px] leading-none font-bold text-ground hover:opacity-90"
      >
        {open ? "×" : "+"}
      </button>
    </>
  );
}
