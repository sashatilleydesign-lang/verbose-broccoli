"use client";

import { useState, useTransition } from "react";
import { reflowScheduleAction } from "@/app/actions/schedule";

export function ReflowButton() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            const result = await reflowScheduleAction();
            const bits = [`${result.scheduled} scheduled`];
            if (result.atRisk > 0) bits.push(`${result.atRisk} at risk`);
            if (result.fragmented > 0) bits.push(`${result.fragmented} split into many chunks`);
            if (result.unscheduled > 0) bits.push(`${result.unscheduled} couldn't fit`);
            setMessage(bits.join(" · "));
          });
        }}
        className="min-h-10 rounded-md bg-accent px-4 text-[13px] font-semibold text-ground hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Reflowing…" : "Reflow schedule"}
      </button>
      {message ? <span className="font-mono-strobe text-[12px] text-ink-dim">{message}</span> : null}
    </div>
  );
}
