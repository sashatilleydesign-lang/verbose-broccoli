"use client";

import { useSyncExternalStore } from "react";

type Mode = "acid" | "calm";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Matches the server's default so hydration never mismatches — the
// blocking script in layout.tsx already set the real attribute before
// paint, and this store picks it up on the client's first read.
function getSnapshot(): Mode {
  return document.documentElement.getAttribute("data-mode") === "calm" ? "calm" : "acid";
}

function getServerSnapshot(): Mode {
  return "acid";
}

function setMode(next: Mode) {
  document.documentElement.setAttribute("data-mode", next);
  localStorage.setItem("strobe-mode", next);
  listeners.forEach((listener) => listener());
}

export function ModeToggle() {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-bold uppercase tracking-wide text-ink-dim">
        {mode === "calm" ? "Calm" : "Acid"}
      </span>
      <button
        role="switch"
        aria-checked={mode === "calm"}
        aria-label="Toggle Acid / Calm mode"
        onClick={() => setMode(mode === "acid" ? "calm" : "acid")}
        className="relative h-7 w-13 rounded-full border border-line bg-panel"
        style={{ boxShadow: "inset 0 2px 5px rgba(0,0,0,0.4)" }}
      >
        <span
          className="absolute top-0.5 h-5 w-5 rounded-full transition-all"
          style={{
            left: mode === "calm" ? "26px" : "2px",
            background:
              "radial-gradient(circle at 35% 30%, #fff, var(--accent) 60%, var(--accent-dim))",
            boxShadow: "0 0 10px var(--accent)",
          }}
        />
      </button>
    </div>
  );
}
