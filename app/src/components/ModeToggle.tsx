"use client";

import { useEffect, useState } from "react";

export function ModeToggle() {
  const [mode, setMode] = useState<"acid" | "calm">("acid");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-mode");
    if (current === "acid" || current === "calm") setMode(current);
  }, []);

  function toggle() {
    const next = mode === "acid" ? "calm" : "acid";
    setMode(next);
    document.documentElement.setAttribute("data-mode", next);
    localStorage.setItem("strobe-mode", next);
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-bold uppercase tracking-wide text-ink-dim">
        {mode === "calm" ? "Calm" : "Acid"}
      </span>
      <button
        role="switch"
        aria-checked={mode === "calm"}
        aria-label="Toggle Acid / Calm mode"
        onClick={toggle}
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
