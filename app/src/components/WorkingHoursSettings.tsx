import { getScheduleProfile } from "@/lib/schedule";
import { createWorkWindow, deleteWorkWindow, createDayOff, deleteDayOff } from "@/app/actions/scheduleProfile";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CONTEXT_OPTIONS = [
  { value: "", label: "Any context" },
  { value: "email", label: "Email" },
  { value: "calls", label: "Calls" },
  { value: "deep_work", label: "Deep work" },
  { value: "admin", label: "Admin" },
];

function fmtMinutes(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${period}` : `${h12}:${String(m).padStart(2, "0")}${period}`;
}

// UserScheduleProfile settings (§11.15): a recurring weekly template of
// multiple labeled windows per day, not one start/end range, plus
// per-date exceptions — see scheduler.ts for how reflow reads this.
// Rendered inside SettingsDrawer's slideout panel, which supplies its
// own title/close chrome, so this only returns the settings content.
export async function WorkingHoursSettings() {
  const { recurring, oneOff, daysOff } = await getScheduleProfile();

  const byDay: Record<number, typeof recurring> = {};
  for (const w of recurring) {
    if (w.dayOfWeek === null) continue;
    (byDay[w.dayOfWeek] ??= []).push(w);
  }

  return (
    <div className="space-y-5">
      <div>
          <p className="mb-2 text-[11px] font-bold tracking-wide text-ink-dim uppercase">Recurring windows</p>
          <div className="space-y-1.5">
            {DAY_NAMES.map((name, dow) => (
              <div key={dow} className="flex flex-wrap items-center gap-2 text-[13px]">
                <span className="w-9 flex-none font-semibold text-ink-dim">{name}</span>
                {(byDay[dow] ?? []).length === 0 ? (
                  <span className="text-ink-dim">off</span>
                ) : (
                  (byDay[dow] ?? []).map((w) => (
                    <span
                      key={w.id}
                      className="inline-flex items-center gap-1.5 rounded border border-line px-2 py-1 text-[12px] text-ink-dim"
                    >
                      {fmtMinutes(w.startMinute)}–{fmtMinutes(w.endMinute)}
                      {w.context ? <span> · {w.context}</span> : null}
                      <form action={deleteWorkWindow.bind(null, w.id)}>
                        <button type="submit" aria-label="Remove window" className="font-bold hover:text-accent">
                          ✕
                        </button>
                      </form>
                    </span>
                  ))
                )}
              </div>
            ))}
          </div>

          <form action={createWorkWindow} className="mt-3 flex flex-wrap items-end gap-2.5">
            <input type="hidden" name="date" value="" />
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-ink-dim uppercase" htmlFor="ww-dayOfWeek">
                Day
              </label>
              <select
                id="ww-dayOfWeek"
                name="dayOfWeek"
                className="min-h-9 rounded-md border border-line bg-ground px-2 py-1.5 text-[13px] text-ink"
              >
                {DAY_NAMES.map((name, dow) => (
                  <option key={dow} value={dow}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-ink-dim uppercase" htmlFor="ww-startTime">
                Start
              </label>
              <input
                id="ww-startTime"
                name="startTime"
                type="time"
                required
                className="min-h-9 rounded-md border border-line bg-ground px-2 py-1.5 text-[13px] text-ink"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-ink-dim uppercase" htmlFor="ww-endTime">
                End
              </label>
              <input
                id="ww-endTime"
                name="endTime"
                type="time"
                required
                className="min-h-9 rounded-md border border-line bg-ground px-2 py-1.5 text-[13px] text-ink"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-ink-dim uppercase" htmlFor="ww-context">
                Prefers
              </label>
              <select
                id="ww-context"
                name="context"
                className="min-h-9 rounded-md border border-line bg-ground px-2 py-1.5 text-[13px] text-ink"
              >
                {CONTEXT_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="min-h-9 rounded-md bg-accent px-3.5 text-[12.5px] font-semibold text-ground hover:opacity-90"
            >
              Add window
            </button>
          </form>
        </div>

        <div className="border-t border-line pt-4">
          <p className="mb-2 text-[11px] font-bold tracking-wide text-ink-dim uppercase">
            Exceptions — a day off, or extra hours on an otherwise-off day
          </p>
          {daysOff.length === 0 && oneOff.length === 0 ? (
            <p className="mb-3 text-[13px] text-ink-dim">No upcoming exceptions.</p>
          ) : (
            <ul className="mb-3 flex flex-wrap gap-2">
              {daysOff.map((d) => (
                <li
                  key={d.id}
                  className="inline-flex items-center gap-1.5 rounded border border-line px-2 py-1 text-[12px] text-ink-dim"
                >
                  {d.date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} — day
                  off
                  <form action={deleteDayOff.bind(null, d.id)}>
                    <button type="submit" aria-label="Remove day off" className="font-bold hover:text-accent">
                      ✕
                    </button>
                  </form>
                </li>
              ))}
              {oneOff.map((w) => (
                <li
                  key={w.id}
                  className="inline-flex items-center gap-1.5 rounded border border-line px-2 py-1 text-[12px] text-ink-dim"
                >
                  {w.date!.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} —{" "}
                  {fmtMinutes(w.startMinute)}–{fmtMinutes(w.endMinute)}
                  {w.context ? ` · ${w.context}` : ""}
                  <form action={deleteWorkWindow.bind(null, w.id)}>
                    <button type="submit" aria-label="Remove extra window" className="font-bold hover:text-accent">
                      ✕
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap gap-6">
            <form action={createDayOff} className="flex items-end gap-2.5">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-ink-dim uppercase" htmlFor="dayoff-date">
                  Take a day off
                </label>
                <input
                  id="dayoff-date"
                  name="date"
                  type="date"
                  required
                  className="min-h-9 rounded-md border border-line bg-ground px-2 py-1.5 text-[13px] text-ink"
                />
              </div>
              <button
                type="submit"
                className="min-h-9 rounded-md border border-line px-3 text-[12.5px] font-semibold text-ink-dim hover:text-ink"
              >
                Add
              </button>
            </form>

            <form action={createWorkWindow} className="flex flex-wrap items-end gap-2.5">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-ink-dim uppercase" htmlFor="extra-date">
                  Extra hours on
                </label>
                <input
                  id="extra-date"
                  name="date"
                  type="date"
                  required
                  className="min-h-9 rounded-md border border-line bg-ground px-2 py-1.5 text-[13px] text-ink"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-ink-dim uppercase" htmlFor="extra-start">
                  Start
                </label>
                <input
                  id="extra-start"
                  name="startTime"
                  type="time"
                  required
                  className="min-h-9 rounded-md border border-line bg-ground px-2 py-1.5 text-[13px] text-ink"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-ink-dim uppercase" htmlFor="extra-end">
                  End
                </label>
                <input
                  id="extra-end"
                  name="endTime"
                  type="time"
                  required
                  className="min-h-9 rounded-md border border-line bg-ground px-2 py-1.5 text-[13px] text-ink"
                />
              </div>
              <button
                type="submit"
                className="min-h-9 rounded-md border border-line px-3 text-[12.5px] font-semibold text-ink-dim hover:text-ink"
              >
                Add
              </button>
            </form>
          </div>
        </div>
      </div>
  );
}
