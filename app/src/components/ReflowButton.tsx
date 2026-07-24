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
            if (result.unscheduled > 0) bits.push(`${result.unscheduled} couldn't fit`);
            setMessage(bits.join(" · "));
          });
        }}
        className="min-h-10 rounded-md border border-accent px-4 text-[12.5px] font-bold tracking-wide text-accent uppercase hover:bg-accent hover:text-ground disabled:opacity-60"
      >
        {pending ? "Reflowing…" : "Reflow schedule"}
      </button>
      {message ? <span className="font-mono-strobe text-[12px] text-ink-dim">{message}</span> : null}
    </div>
  );
}
