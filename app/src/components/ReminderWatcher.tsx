"use client";

import { useEffect, useRef, useState } from "react";
import { getReminderCandidates, type ReminderCandidate } from "@/app/actions/reminders";

const POLL_MS = 30_000;
const AUTO_DISMISS_MS = 8_000;
const SEEN_KEY = "strobe-reminders-seen";

type Toast = ReminderCandidate & { toastId: number };

// AppShell (and this watcher with it) is mounted per-page rather than in
// the root layout, so a plain in-memory seen-set would reset — and
// re-nag with the same toast — on every navigation between pages in the
// same tab. sessionStorage survives that without needing any backend.
function loadSeen(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}

function saveSeen(seen: Set<string>) {
  try {
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
  } catch {
    // sessionStorage unavailable (e.g. private-mode edge cases) — the
    // watcher still works, it just can't dedupe across navigations.
  }
}

export function ReminderWatcher() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seen = useRef<Set<string>>(new Set());
  const nextToastId = useRef(0);

  useEffect(() => {
    let cancelled = false;
    seen.current = loadSeen();

    async function poll() {
      const candidates = await getReminderCandidates().catch(() => []);
      if (cancelled) return;
      const fresh = candidates.filter((c) => !seen.current.has(c.id));
      if (fresh.length === 0) return;
      fresh.forEach((c) => seen.current.add(c.id));
      saveSeen(seen.current);
      const newToasts = fresh.map((c) => ({ ...c, toastId: nextToastId.current++ }));
      setToasts((prev) => [...prev, ...newToasts]);
      newToasts.forEach((t) => {
        setTimeout(() => {
          setToasts((prev) => prev.filter((x) => x.toastId !== t.toastId));
        }, AUTO_DISMISS_MS);
      });
    }

    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  function dismiss(toastId: number) {
    setToasts((prev) => prev.filter((t) => t.toastId !== toastId));
  }

  if (toasts.length === 0) return null;

  return (
    // bottom-20, not bottom-4 — the quick-capture FAB (§11.13) now
    // permanently occupies that corner's bottom-4 spot, so reminder
    // toasts stack starting just above it instead of overlapping it.
    <div className="fixed right-4 bottom-20 z-40 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.toastId}
          className="shadow-panel flex max-w-xs items-start gap-2.5 rounded-md border border-line bg-panel px-4 py-3"
        >
          <span className="mt-0.5 text-[13px]">{t.kind === "atRisk" ? "⚠" : "⏰"}</span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold tracking-wide text-ink-dim uppercase">
              {t.kind === "atRisk" ? "Past due" : "Starting now"}
            </p>
            <p className="text-[13.5px] font-semibold text-ink">{t.title}</p>
          </div>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => dismiss(t.toastId)}
            className="text-[13px] font-bold text-ink-dim hover:text-ink"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
