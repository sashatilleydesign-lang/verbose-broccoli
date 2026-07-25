import Link from "next/link";
import { verifySession } from "@/lib/dal";
import {
  getDaySchedule,
  getUpcomingSchedule,
  getWeekSchedule,
  getMonthGrid,
  startOfWeek,
  dateKey,
} from "@/lib/schedule";
import { fmtTime, kindClasses, hourBounds } from "@/lib/scheduleFormat";
import { AppShell } from "@/components/AppShell";
import { ReflowButton } from "@/components/ReflowButton";
import { DayDragItems, WeekDragGrid } from "@/components/ScheduleDrag";
import { ClientDot } from "@/components/ClientBadge";
import { TaskTitleButton } from "@/components/TaskTitleButton";
import { createCalendarEvent, deleteCalendarEvent } from "@/app/actions/schedule";

const ROW_H = 56;
const WEEK_ROW_H = 44;

function parseDateParam(s: string | undefined): Date {
  const m = s ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(s) : null;
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

function viewHref(view: "day" | "week" | "month", date: Date) {
  return `/schedule?view=${view}&date=${dateKey(date)}`;
}

function addDays(d: Date, n: number): Date {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + n);
  return nd;
}

function ViewTabs({ view, anchor }: { view: string; anchor: Date }) {
  const tabs: Array<{ key: "day" | "week" | "month"; label: string }> = [
    { key: "day", label: "Day" },
    { key: "week", label: "Week" },
    { key: "month", label: "Month" },
  ];
  return (
    <div className="flex items-center gap-1 rounded-md border border-line bg-panel p-1">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={viewHref(t.key, anchor)}
          className={`rounded-sm px-3 py-1.5 text-[12.5px] font-bold uppercase ${
            view === t.key ? "bg-accent text-ground" : "text-ink-dim hover:text-ink"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}

function NavRow({ view, anchor, label }: { view: "day" | "week" | "month"; anchor: Date; label: string }) {
  const prev = view === "day" ? addDays(anchor, -1) : view === "week" ? addDays(anchor, -7) : new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1);
  const next = view === "day" ? addDays(anchor, 1) : view === "week" ? addDays(anchor, 7) : new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
  return (
    <div className="flex items-center gap-3">
      <Link href={viewHref(view, prev)} aria-label="Previous" className="rounded-md border border-line px-2.5 py-1.5 text-[13px] font-bold text-ink-dim hover:text-accent">
        ‹
      </Link>
      <span className="min-w-[11ch] text-center text-[13px] font-bold text-ink">{label}</span>
      <Link href={viewHref(view, next)} aria-label="Next" className="rounded-md border border-line px-2.5 py-1.5 text-[13px] font-bold text-ink-dim hover:text-accent">
        ›
      </Link>
      <Link href={viewHref(view, new Date())} className="rounded-md border border-line px-2.5 py-1.5 text-[11.5px] font-bold text-ink-dim uppercase hover:text-accent">
        Today
      </Link>
    </div>
  );
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  await verifySession();
  const sp = await searchParams;
  const view: "day" | "week" | "month" = sp.view === "week" || sp.view === "month" ? sp.view : "day";
  const anchor = parseDateParam(sp.date);
  const todayKey = dateKey(new Date());

  return (
    <AppShell>
      <div className="mb-6">
        <p className="mb-2 text-[11.5px] font-bold tracking-wide text-accent uppercase">Schedule</p>
        <p className="max-w-[64ch] text-[15.5px] leading-relaxed text-ink-dim">
          Fixed events hold their time. Soft deadlines bend around them. Hard deadlines that stop fitting
          get flagged — never silently dropped.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <ViewTabs view={view} anchor={anchor} />
        <NavRow
          view={view}
          anchor={anchor}
          label={
            view === "day"
              ? anchor.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
              : view === "week"
                ? `Week of ${startOfWeek(anchor).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                : anchor.toLocaleDateString(undefined, { month: "long", year: "numeric" })
          }
        />
      </div>

      {view === "day" ? <DayView anchor={anchor} todayKey={todayKey} /> : null}
      {view === "week" ? <WeekView anchor={anchor} todayKey={todayKey} /> : null}
      {view === "month" ? <MonthView anchor={anchor} todayKey={todayKey} /> : null}
    </AppShell>
  );
}

async function DayView({ anchor, todayKey }: { anchor: Date; todayKey: string }) {
  const today = await getDaySchedule(anchor);
  const upcoming = await getUpcomingSchedule(6, anchor);
  const { startHour: gridStartHour, endHour: gridEndHour } = hourBounds(today);
  const gridStart = new Date(anchor);
  gridStart.setHours(gridStartHour, 0, 0, 0);
  const totalHours = gridEndHour - gridStartHour;
  const isToday = dateKey(anchor) === todayKey;

  return (
    <>
      <div className="shadow-panel mb-8 rounded-md border border-line bg-panel">
        <div className="flex items-center justify-between border-b border-line p-4">
          <h1 className="text-[15px] font-bold">{isToday ? "Today's schedule" : "Schedule"}</h1>
          <span className="text-[12px] text-ink-dim">
            {anchor.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
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
          <DayDragItems items={today} gridStart={gridStart} rowH={ROW_H} />
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
            <input id="date" name="date" type="date" required defaultValue={dateKey(anchor)} className="min-h-10 rounded-md border border-line bg-ground px-3 py-2 text-[14px] text-ink" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-ink-dim uppercase" htmlFor="startTime">Start</label>
            <input id="startTime" name="startTime" type="time" required className="min-h-10 rounded-md border border-line bg-ground px-3 py-2 text-[14px] text-ink" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-ink-dim uppercase" htmlFor="endTime">End</label>
            <input id="endTime" name="endTime" type="time" required className="min-h-10 rounded-md border border-line bg-ground px-3 py-2 text-[14px] text-ink" />
          </div>
          <button type="submit" className="min-h-10 rounded-md bg-accent px-4 text-[13px] font-semibold text-ground hover:opacity-90">
            Add
          </button>
        </form>
      </div>

      <div>
        <p className="mb-3 text-[11.5px] font-bold tracking-wide text-ink-dim uppercase">Upcoming</p>
        {upcoming.size === 0 ? (
          <p className="text-[13.5px] text-ink-dim">Nothing scheduled beyond this day yet.</p>
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
                        {item.taskId ? (
                          <TaskTitleButton
                            task={{
                              id: item.taskId,
                              title: item.title,
                              note: item.note ?? null,
                              targetDate: item.targetDate ?? null,
                            }}
                            className="font-semibold"
                          />
                        ) : (
                          <strong className="font-semibold">{item.title}</strong>
                        )}
                        {item.clientName ? (
                          <span className="inline-flex items-center gap-1 text-ink-dim">
                            {" "}
                            · {item.clientColor ? <ClientDot colorTag={item.clientColor} /> : null} {item.clientName}
                          </span>
                        ) : null}
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
    </>
  );
}

async function WeekView({ anchor, todayKey }: { anchor: Date; todayKey: string }) {
  const weekStart = startOfWeek(anchor);
  const week = await getWeekSchedule(weekStart);
  const allItems = week.flatMap((d) => d.items);
  const { startHour: gridStartHour, endHour: gridEndHour } = hourBounds(allItems);
  const totalHours = gridEndHour - gridStartHour;

  return (
    <div className="shadow-panel mb-8 overflow-hidden rounded-md border border-line bg-panel">
      <div className="grid" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
        <div className="border-b border-line" />
        {week.map((d) => (
          <div key={`h-${d.key}`} className="border-b border-line px-1.5 py-2 text-center">
            <p className="text-[10.5px] font-bold tracking-wide text-ink-dim uppercase">
              {d.date.toLocaleDateString(undefined, { weekday: "short" })}
            </p>
            <p className={`text-[13px] font-bold ${d.key === todayKey ? "text-accent" : "text-ink"}`}>{d.date.getDate()}</p>
          </div>
        ))}

        <WeekDragGrid days={week} gridStartHour={gridStartHour} totalHours={totalHours} rowH={WEEK_ROW_H} todayKey={todayKey} />
      </div>
    </div>
  );
}

async function MonthView({ anchor, todayKey }: { anchor: Date; todayKey: string }) {
  const { days } = await getMonthGrid(anchor);
  const MAX_CHIPS = 3;

  return (
    <div className="shadow-panel mb-8 overflow-hidden rounded-md border border-line bg-panel">
      <div className="grid grid-cols-7 border-b border-line">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((w) => (
          <div key={w} className="px-2 py-2 text-center text-[10.5px] font-bold tracking-wide text-ink-dim uppercase">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => (
          <Link
            key={d.key}
            href={viewHref("day", d.date)}
            className={`min-h-[92px] border-r border-b border-line p-1.5 last:border-r-0 hover:bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] ${
              d.inMonth ? "" : "opacity-40"
            }`}
          >
            <p className={`mb-1 text-[12px] font-bold ${d.key === todayKey ? "text-accent" : "text-ink"}`}>{d.date.getDate()}</p>
            <div className="space-y-0.5">
              {d.items.slice(0, MAX_CHIPS).map((item) => (
                <p
                  key={item.id}
                  className={`truncate rounded-sm border px-1 text-[10px] font-semibold ${kindClasses(item.kind)} ${item.kind === "atRisk" ? "text-ground" : "text-ink"}`}
                >
                  {item.kind === "fixed" ? "🔒 " : ""}
                  {item.title}
                </p>
              ))}
              {d.items.length > MAX_CHIPS ? (
                <p className="text-[10px] font-semibold text-ink-dim">+{d.items.length - MAX_CHIPS} more</p>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
