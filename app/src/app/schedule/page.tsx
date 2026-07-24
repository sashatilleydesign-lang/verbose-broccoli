import { verifySession } from "@/lib/dal";
import { getTodaySchedule, getUpcomingSchedule } from "@/lib/schedule";
import { AppShell } from "@/components/AppShell";
import { ReflowButton } from "@/components/ReflowButton";
import { createCalendarEvent, deleteCalendarEvent } from "@/app/actions/schedule";

const ROW_H = 56;

function fmtTime(d: Date) {
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function kindClasses(kind: string) {
  if (kind === "atRisk") return "bg-accent border-accent";
  if (kind === "fixed") {
    return "border-line";
  }
  return "border-line bg-[color-mix(in_srgb,var(--accent)_16%,var(--panel))]";
}

export default async function SchedulePage() {
  await verifySession();
  const today = await getTodaySchedule();
  const upcoming = await getUpcomingSchedule(6);

  // Auto-expand to fit outliers, but clamp so one stray odd-hour event
  // (a 2am flight, say) can't blow the grid out to a nearly-empty span.
  const hours = today.map((i) => [i.start.getHours(), i.end.getHours() + (i.end.getMinutes() > 0 ? 1 : 0)]).flat();
  const gridStartHour = Math.max(6, Math.min(7, ...(hours.length ? hours : [7])));
  const gridEndHour = Math.min(22, Math.max(19, ...(hours.length ? hours : [19])));
  const gridStart = new Date();
  gridStart.setHours(gridStartHour, 0, 0, 0);
  const totalHours = gridEndHour - gridStartHour;

  return (
    <AppShell>
      <div className="mb-6">
        <p className="mb-2 text-[11.5px] font-bold tracking-wide text-accent uppercase">Schedule</p>
        <p className="max-w-[64ch] text-[15.5px] leading-relaxed text-ink-dim">
          Fixed events hold their time. Soft deadlines bend around them. Hard deadlines that stop fitting
          get flagged — never silently dropped.
        </p>
      </div>

      <div className="shadow-panel mb-8 rounded-md border border-line bg-panel">
        <div className="flex items-center justify-between border-b border-line p-4">
          <h1 className="text-[15px] font-bold">Today's schedule</h1>
          <span className="text-[12px] text-ink-dim">
            {new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
          </span>
        </div>

        <div className="relative overflow-hidden p-4" style={{ paddingLeft: "60px" }}>
          {Array.from({ length: totalHours }, (_, i) => (
            <div key={i} className="relative border-t border-line first:border-t-0" style={{ height: ROW_H }}>
              <span
                className="font-mono-strobe absolute bg-panel pr-1.5 text-[11px] font-semibold text-ink-dim"
                style={{ left: "-56px", top: "-8px" }}
              >
                {String(gridStartHour + i).padStart(2, "0")}:00
              </span>
            </div>
          ))}
          <div className="absolute top-4 right-4 bottom-4 left-[60px]">
            {today.length === 0 ? (
              <p className="text-[13px] text-ink-dim">No blocks yet — hit Reflow to place today's work.</p>
            ) : null}
            {today.map((item) => {
              const top = ((item.start.getTime() - gridStart.getTime()) / 3_600_000) * ROW_H;
              const height = Math.max(((item.end.getTime() - item.start.getTime()) / 3_600_000) * ROW_H - 4, 20);
              return (
                <div
                  key={item.id}
                  className={`absolute right-1 left-1 overflow-hidden rounded-md border px-3 py-1.5 ${kindClasses(item.kind)}`}
                  style={{ top, height }}
                >
                  <p
                    className={`text-[12.5px] font-bold ${item.kind === "atRisk" ? "text-ground" : "text-ink"}`}
                  >
                    {item.kind === "fixed" ? "🔒 " : item.kind === "atRisk" ? "⚠ " : ""}
                    {item.title}
                  </p>
                  <p className={`text-[10.5px] font-semibold ${item.kind === "atRisk" ? "text-ground/80" : "text-ink-dim"}`}>
                    {fmtTime(item.start)}–{fmtTime(item.end)}
                    {item.clientName ? ` · ${item.clientName}` : ""}
                    {item.kind === "atRisk" ? " · AT RISK" : ""}
                    {item.kind === "fixed" ? " · FIXED" : ""}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line p-4">
          <ReflowButton />
          <div className="flex items-center gap-4 text-[12px] text-ink-dim">
            <span><span className="mr-1.5 inline-block h-3 w-4 rounded-sm border border-line bg-[color-mix(in_srgb,var(--accent)_16%,var(--panel))]" />Movable</span>
            <span><span className="mr-1.5 inline-block h-3 w-4 rounded-sm border border-line" />Fixed</span>
            <span><span className="mr-1.5 inline-block h-3 w-4 rounded-sm bg-accent" />At risk</span>
          </div>
        </div>
      </div>

      <div className="shadow-panel mb-8 rounded-md border border-line bg-panel p-5">
        <p className="mb-3 text-[11.5px] font-bold tracking-wide text-ink-dim uppercase">Add a fixed event</p>
        <form action={createCalendarEvent} className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-ink-dim uppercase" htmlFor="title">Title</label>
            <input id="title" name="title" required placeholder="Call — Kite Studio" className="min-h-10 rounded-md border border-line bg-ground px-3 py-2 text-[14px] text-ink" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-ink-dim uppercase" htmlFor="date">Date</label>
            <input id="date" name="date" type="date" required className="min-h-10 rounded-md border border-line bg-ground px-3 py-2 text-[14px] text-ink" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-ink-dim uppercase" htmlFor="startTime">Start</label>
            <input id="startTime" name="startTime" type="time" required className="min-h-10 rounded-md border border-line bg-ground px-3 py-2 text-[14px] text-ink" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-ink-dim uppercase" htmlFor="endTime">End</label>
            <input id="endTime" name="endTime" type="time" required className="min-h-10 rounded-md border border-line bg-ground px-3 py-2 text-[14px] text-ink" />
          </div>
          <button type="submit" className="min-h-10 rounded-md border border-accent px-4 text-[12.5px] font-bold text-accent uppercase hover:bg-accent hover:text-ground">
            Add
          </button>
        </form>
      </div>

      <div>
        <p className="mb-3 text-[11.5px] font-bold tracking-wide text-ink-dim uppercase">Upcoming</p>
        {upcoming.size === 0 ? (
          <p className="text-[13.5px] text-ink-dim">Nothing scheduled beyond today yet.</p>
        ) : (
          <div className="shadow-panel divide-y divide-line rounded-md border border-line bg-panel">
            {[...upcoming.entries()].map(([day, items]) => (
              <div key={day} className="p-4">
                <p className="mb-2 text-[12px] font-bold text-ink-dim">
                  {new Date(day).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                </p>
                <ul className="space-y-2">
                  {items.map((item) => (
                    <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 text-[13.5px]">
                      <span>
                        {item.kind === "fixed" ? "🔒 " : ""}
                        <strong className="font-semibold">{item.title}</strong>
                        {item.clientName ? <span className="text-ink-dim"> · {item.clientName}</span> : null}
                      </span>
                      <span className="font-mono-strobe flex items-center gap-3 text-[11.5px] text-ink-dim">
                        {fmtTime(item.start)}–{fmtTime(item.end)}
                        {item.kind === "fixed" ? (
                          <form action={deleteCalendarEvent.bind(null, item.id)}>
                            <button type="submit" className="border-b border-line hover:border-accent hover:text-accent">
                              remove
                            </button>
                          </form>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
