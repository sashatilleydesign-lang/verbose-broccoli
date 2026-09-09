"use client";

import { useState } from "react";

// A generic right-anchored slideout, same overlay/panel pattern MobileNav
// already uses for its mobile menu — reused here for settings-style
// content (starting with Working hours, §11.15) that shouldn't compete
// with the main view for page-scroll space, but also shouldn't need a
// scroll-to-the-bottom-and-expand to reach.
export function SettingsDrawer({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-[12.5px] font-bold text-ink-dim hover:text-ink"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-4 w-4">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        {label}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button type="button" aria-label={`Close ${label}`} onClick={() => setOpen(false)} className="absolute inset-0 bg-black/30" />
          <div className="shadow-panel relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-panel">
            <div className="sticky top-0 flex items-center justify-between border-b border-line bg-panel px-5 py-4">
              <p className="text-[15px] font-bold">{label}</p>
              <button
                type="button"
                aria-label={`Close ${label}`}
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-ink-dim hover:text-ink"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            <div className="p-5">{children}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}
