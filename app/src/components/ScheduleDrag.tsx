"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { ScheduleItem } from "@/lib/schedule";
import { fmtTime, kindClasses, dateKey } from "@/lib/scheduleFormat";
import {
  moveScheduledBlock,
  resizeScheduledBlock,
  deleteCalendarEvent,
  restoreCalendarEvent,
  createCalendarEventQuick,
} from "@/app/actions/schedule";
import { ClientDot } from "@/components/ClientBadge";
import { openTaskNote } from "@/components/taskNoteStore";
import { showUndo } from "@/components/undoStore";

const SNAP_MINUTES = 15;
const MIN_MOVE_MS = 60_000;
const MIN_DURATION_MS = 15 * 60_000;
// Visual-only mirror of the server's QUICK_ADD_DURATION_MS (§11.8) — used
// just to clamp the popover's implied end time within the day when
// deciding where to snap a click near the very end of the grid.
const QUICK_ADD_DURATION_MS = 30 * 60_000;

type Override = { start: Date; end: Date };
// originalStart is captured once at drag-start (onDown), not read back
// off `item.start` in onUp — during a fast drag, React may not have
// re-rendered between the last onMove and the final onUp, so the `item`
// closed over there isn't reliably the pre-drag value. Recording it
// explicitly up front is what makes the §11.12 undo revert accurate.
type DragInfo = { grabOffsetY: number; durationMs: number; originalStart: Date };
type ResizeInfo = { startY: number; startDurationMs: number };

function snapDurationMs(ms: number): number {
  const minutes = Math.round(ms / 60_000 / SNAP_MINUTES) * SNAP_MINUTES;
  return Math.max(MIN_DURATION_MS, minutes * 60_000);
}

// Live at-risk (§11.11): item.end already reflects the current drag/
// resize override (see `display` below), so recomputing this fresh on
// every render — rather than trusting the server-computed `item.kind`
// from before the drag started — is what makes the warning flip the
// instant a live position would land past the deadline, not just after
// the drop and the next page load.
function effectiveKind(item: ScheduleItem): "movable" | "fixed" | "atRisk" {
  if (item.kind === "fixed") return "fixed";
  if (item.deadlineType === "hard" && item.dueDate) {
    return item.end.getTime() > item.dueDate.getTime() ? "atRisk" : "movable";
  }
  return item.kind;
}

function ResizeHandle({
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize touch-none"
      aria-hidden="true"
    />
  );
}

function useOverrideSync(items: ScheduleItem[], setOverrides: React.Dispatch<React.SetStateAction<Record<string, Override>>>) {
  useEffect(() => {
    setOverrides((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const it of items) {
        const ov = next[it.id];
        // Both start and end must match the server value before dropping the
        // override — checking start alone was fine for a move (which always
        // changes start), but a resize deliberately holds start constant, so
        // that check alone would clear a resize override before its own
        // action even committed, on every render that reconstructs `items`
        // (as WeekDragGrid's flatMap-derived array does).
        if (ov && ov.start.getTime() === it.start.getTime() && ov.end.getTime() === it.end.getTime()) {
          delete next[it.id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);
}

function snapWithinDay(start: Date, durationMs: number): Date {
  const dayStart = new Date(start);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 24 * 3_600_000);
  const rawMinutes = Math.round((start.getTime() - dayStart.getTime()) / 60_000 / SNAP_MINUTES) * SNAP_MINUTES;
  let snapped = new Date(dayStart.getTime() + rawMinutes * 60_000);
  if (snapped < dayStart) snapped = dayStart;
  if (snapped.getTime() + durationMs > dayEnd.getTime()) snapped = new Date(dayEnd.getTime() - durationMs);
  return snapped;
}

// Click-to-create (§11.8): the same "just a name" minimal quick-add as
// §11.1. Enter commits it; Escape or clicking/tabbing away discards it —
// no half-created lingering state to clean up later.
function QuickAddPopover({
  style,
  onSubmit,
  onCancel,
}: {
  style: React.CSSProperties;
  onSubmit: (title: string) => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div
      className="shadow-panel absolute z-30 rounded-md border border-accent bg-panel p-1.5"
      style={style}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <input
        ref={inputRef}
        type="text"
        placeholder="Event name…"
        className="min-h-8 w-40 rounded border border-line bg-ground px-2 text-[12.5px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const value = e.currentTarget.value.trim();
            if (value) onSubmit(value);
            else onCancel();
          } else if (e.key === "Escape") {
            onCancel();
          }
        }}
        onBlur={onCancel}
      />
    </div>
  );
}

// Clicking a scheduled task's title opens its note (§11.9) — fixed
// items are CalendarEvents, not Tasks, so they have no note to open and
// render as plain text. stopPropagation on pointerdown keeps a click
// here from also being read as the start of a drag by the parent block.
function ScheduleItemTitle({
  item,
  className,
  icon,
}: {
  item: ScheduleItem;
  className: string;
  icon?: string;
}) {
  if (item.kind === "fixed" || !item.taskId) {
    return (
      <span className={className}>
        {icon}
        {item.title}
      </span>
    );
  }
  const taskId = item.taskId;
  return (
    <button
      type="button"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={() =>
        openTaskNote({ id: taskId, title: item.title, note: item.note ?? null, targetDate: item.targetDate ?? null })
      }
      // relative + z-10: ResizeHandle is `position: absolute`, which
      // paints above normal-flow content regardless of DOM order — this
      // button has to become a positioned element with a higher z-index
      // itself to win the shared pixels on a very short block, where the
      // 8px handle and a single line of title text don't both fit.
      className={`relative z-10 text-left hover:underline ${className}`}
    >
      {icon}
      {item.title}
    </button>
  );
}

function RemoveFixedButton({ item }: { item: ScheduleItem }) {
  if (item.kind !== "fixed") return null;
  return (
    <button
      type="button"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={() => {
        deleteCalendarEvent(item.id);
        showUndo({
          message: "Removed.",
          onUndo: () => restoreCalendarEvent(item.title, item.start.getTime(), item.end.getTime()),
        });
      }}
      aria-label={`Remove ${item.title}`}
      className="text-[11px] font-bold text-ink-dim hover:text-accent"
    >
      ✕
    </button>
  );
}

export function DayDragItems({ items, gridStart, rowH }: { items: ScheduleItem[]; gridStart: Date; rowH: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const dragInfo = useRef<DragInfo | null>(null);
  const [resizeId, setResizeId] = useState<string | null>(null);
  const resizeInfo = useRef<ResizeInfo | null>(null);
  const [quickAdd, setQuickAdd] = useState<{ start: Date } | null>(null);
  const [, startTransition] = useTransition();

  useOverrideSync(items, setOverrides);

  const display = items.map((it) => (overrides[it.id] ? { ...it, ...overrides[it.id] } : it));

  function onDown(e: React.PointerEvent<HTMLDivElement>, item: ScheduleItem) {
    if (item.kind === "fixed") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragInfo.current = {
      grabOffsetY: e.clientY - e.currentTarget.getBoundingClientRect().top,
      durationMs: item.end.getTime() - item.start.getTime(),
      originalStart: item.start,
    };
    setDragId(item.id);
  }

  function onMove(e: React.PointerEvent<HTMLDivElement>, item: ScheduleItem) {
    if (dragId !== item.id || !dragInfo.current || !containerRef.current) return;
    const containerTop = containerRef.current.getBoundingClientRect().top;
    const rawTop = e.clientY - dragInfo.current.grabOffsetY - containerTop;
    const newStart = new Date(gridStart.getTime() + (rawTop / rowH) * 3_600_000);
    const newEnd = new Date(newStart.getTime() + dragInfo.current.durationMs);
    setOverrides((prev) => ({ ...prev, [item.id]: { start: newStart, end: newEnd } }));
  }

  function onUp(item: ScheduleItem) {
    if (dragId !== item.id || !dragInfo.current) return;
    const { durationMs, originalStart } = dragInfo.current;
    const current = overrides[item.id];
    setDragId(null);
    dragInfo.current = null;
    if (!current) return;

    const snappedStart = snapWithinDay(current.start, durationMs);
    const snappedEnd = new Date(snappedStart.getTime() + durationMs);
    setOverrides((prev) => ({ ...prev, [item.id]: { start: snappedStart, end: snappedEnd } }));

    if (Math.abs(snappedStart.getTime() - originalStart.getTime()) >= MIN_MOVE_MS) {
      startTransition(() => {
        moveScheduledBlock(item.id, snappedStart.getTime());
      });
      showUndo({
        message: "Moved.",
        onUndo: () => moveScheduledBlock(item.id, originalStart.getTime()),
      });
    }
  }

  function onResizeDown(e: React.PointerEvent<HTMLDivElement>, item: ScheduleItem) {
    if (item.kind === "fixed") return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    resizeInfo.current = { startY: e.clientY, startDurationMs: item.end.getTime() - item.start.getTime() };
    setResizeId(item.id);
  }

  function onResizeMove(e: React.PointerEvent<HTMLDivElement>, item: ScheduleItem) {
    if (resizeId !== item.id || !resizeInfo.current) return;
    e.stopPropagation();
    const deltaMs = ((e.clientY - resizeInfo.current.startY) / rowH) * 3_600_000;
    const newDurationMs = Math.max(MIN_DURATION_MS, resizeInfo.current.startDurationMs + deltaMs);
    setOverrides((prev) => ({ ...prev, [item.id]: { start: item.start, end: new Date(item.start.getTime() + newDurationMs) } }));
  }

  function onResizeUp(item: ScheduleItem) {
    if (resizeId !== item.id || !resizeInfo.current) return;
    const current = overrides[item.id];
    setResizeId(null);
    resizeInfo.current = null;
    if (!current) return;

    const snappedMs = snapDurationMs(current.end.getTime() - current.start.getTime());
    const snappedEnd = new Date(current.start.getTime() + snappedMs);
    setOverrides((prev) => ({ ...prev, [item.id]: { start: item.start, end: snappedEnd } }));

    startTransition(() => {
      resizeScheduledBlock(item.id, snappedMs / 60_000);
    });
  }

  function onBackgroundClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const rawTop = e.clientY - rect.top;
    const rawStart = new Date(gridStart.getTime() + (rawTop / rowH) * 3_600_000);
    const start = snapWithinDay(rawStart, QUICK_ADD_DURATION_MS);
    setQuickAdd({ start });
  }

  function submitQuickAdd(title: string) {
    if (!quickAdd) return;
    const formData = new FormData();
    formData.set("title", title);
    startTransition(() => {
      createCalendarEventQuick(quickAdd.start.getTime(), formData);
    });
    setQuickAdd(null);
  }

  return (
    <div ref={containerRef} className="absolute top-4 right-4 bottom-4 left-[60px]">
      {/* Sibling of (not ancestor of) the item layer below, so a click that
          lands on an item never bubbles here — only a genuine click on
          empty grid space does. */}
      <div className="absolute inset-0" onClick={onBackgroundClick} aria-hidden="true" />
      {display.length === 0 ? (
        <p className="pointer-events-none text-[13px] text-ink-dim">
          Nothing scheduled — hit Reflow to place today&apos;s work.
        </p>
      ) : null}
      {display.map((item) => {
        const top = ((item.start.getTime() - gridStart.getTime()) / 3_600_000) * rowH;
        const height = Math.max(((item.end.getTime() - item.start.getTime()) / 3_600_000) * rowH - 4, 20);
        const dragging = dragId === item.id;
        const resizing = resizeId === item.id;
        const kind = effectiveKind(item);
        return (
          <div
            key={item.id}
            onPointerDown={(e) => onDown(e, item)}
            onPointerMove={(e) => onMove(e, item)}
            onPointerUp={() => onUp(item)}
            className={`absolute right-1 left-1 overflow-hidden rounded-md border px-3 py-1.5 select-none ${kindClasses(kind)} ${
              item.kind !== "fixed" ? "cursor-grab touch-none active:cursor-grabbing" : ""
            } ${dragging || resizing ? "z-10 opacity-90 shadow-lg" : ""}`}
            style={{ top, height }}
          >
            {/* Rendered before the title/detail content (not after), so
                where the two visually overlap on a very short block —
                the resize floor leaves no room for both a text line and
                an 8px handle — the title wins the click. The rest of the
                bottom edge stays freely resizable. */}
            {item.kind !== "fixed" ? (
              <ResizeHandle
                onPointerDown={(e) => onResizeDown(e, item)}
                onPointerMove={(e) => onResizeMove(e, item)}
                onPointerUp={() => onResizeUp(item)}
              />
            ) : null}
            <div className="flex min-w-0 items-start justify-between gap-2">
              <ScheduleItemTitle
                item={item}
                icon={kind === "fixed" ? "🔒 " : kind === "atRisk" ? "⚠ " : ""}
                className={`min-w-0 truncate text-[12.5px] font-bold ${kind === "atRisk" ? "text-ground" : "text-ink"}`}
              />
              <RemoveFixedButton item={item} />
            </div>
            <p
              className={`inline-flex flex-wrap items-center gap-1 text-[10.5px] font-semibold ${kind === "atRisk" ? "text-ground/80" : "text-ink-dim"}`}
            >
              <span>
                {fmtTime(item.start)}–{fmtTime(item.end)}
              </span>
              {item.clientName ? (
                <span className="inline-flex items-center gap-1">
                  · {item.clientColor ? <ClientDot colorTag={item.clientColor} /> : null} {item.clientName}
                </span>
              ) : null}
              {item.partTotal ? (
                <span>
                  · Part {item.partIndex} of {item.partTotal}
                </span>
              ) : null}
              {kind === "atRisk" ? <span>· AT RISK</span> : null}
              {kind === "fixed" ? <span>· FIXED</span> : null}
            </p>
          </div>
        );
      })}
      {quickAdd ? (
        <QuickAddPopover
          style={{ top: ((quickAdd.start.getTime() - gridStart.getTime()) / 3_600_000) * rowH, left: 4 }}
          onSubmit={submitQuickAdd}
          onCancel={() => setQuickAdd(null)}
        />
      ) : null}
    </div>
  );
}

export function WeekDragGrid({
  days,
  gridStartHour,
  totalHours,
  rowH,
  todayKey,
}: {
  days: { date: Date; key: string; items: ScheduleItem[] }[];
  gridStartHour: number;
  totalHours: number;
  rowH: number;
  todayKey: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<{ colIndex: number; top: number } | null>(null);
  const dragInfo = useRef<DragInfo | null>(null);
  const dragPosRef = useRef<{ colIndex: number; top: number } | null>(null);
  const [resizeId, setResizeId] = useState<string | null>(null);
  const resizeInfo = useRef<ResizeInfo | null>(null);
  const [quickAdd, setQuickAdd] = useState<{ start: Date; colIndex: number } | null>(null);
  const [, startTransition] = useTransition();

  const allItems = days.flatMap((d) => d.items);
  useOverrideSync(allItems, setOverrides);

  function dayGridStartFor(date: Date) {
    const d = new Date(date);
    d.setHours(gridStartHour, 0, 0, 0);
    return d;
  }

  function colIndexFor(item: ScheduleItem) {
    const idx = days.findIndex((d) => d.key === dateKey(item.start));
    return idx === -1 ? 0 : idx;
  }

  // Items live in a single flat, absolutely-positioned layer (not nested
  // inside per-day column divs) so the dragged item's DOM node never gets
  // reparented mid-drag — moving it between React-rendered column
  // subtrees would silently break pointer capture partway through a
  // cross-day drag.
  function onDown(e: React.PointerEvent<HTMLDivElement>, item: ScheduleItem) {
    if (item.kind === "fixed") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragInfo.current = {
      grabOffsetY: e.clientY - e.currentTarget.getBoundingClientRect().top,
      durationMs: item.end.getTime() - item.start.getTime(),
      originalStart: item.start,
    };
    const colIndex = colIndexFor(item);
    const dayTop = dayGridStartFor(days[colIndex].date);
    const initial = { colIndex, top: ((item.start.getTime() - dayTop.getTime()) / 3_600_000) * rowH };
    dragPosRef.current = initial;
    setDragPos(initial);
    setDragId(item.id);
  }

  function onMove(e: React.PointerEvent<HTMLDivElement>, item: ScheduleItem) {
    if (dragId !== item.id || !dragInfo.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const labelWidth = 56;
    const colWidth = (rect.width - labelWidth) / 7;
    const rawCol = Math.floor((e.clientX - rect.left - labelWidth) / colWidth);
    const colIndex = Math.max(0, Math.min(6, rawCol));
    const rawTop = e.clientY - dragInfo.current.grabOffsetY - rect.top;
    const next = { colIndex, top: rawTop };
    dragPosRef.current = next;
    setDragPos(next);
  }

  function onUp(item: ScheduleItem) {
    if (dragId !== item.id || !dragInfo.current) return;
    const { durationMs, originalStart } = dragInfo.current;
    const pos = dragPosRef.current;
    setDragId(null);
    setDragPos(null);
    dragInfo.current = null;
    dragPosRef.current = null;
    if (!pos) return;

    const dayTop = dayGridStartFor(days[pos.colIndex].date);
    const rawStart = new Date(dayTop.getTime() + (pos.top / rowH) * 3_600_000);
    const snappedStart = snapWithinDay(rawStart, durationMs);
    const snappedEnd = new Date(snappedStart.getTime() + durationMs);
    setOverrides((prev) => ({ ...prev, [item.id]: { start: snappedStart, end: snappedEnd } }));

    if (Math.abs(snappedStart.getTime() - originalStart.getTime()) >= MIN_MOVE_MS) {
      startTransition(() => {
        moveScheduledBlock(item.id, snappedStart.getTime());
      });
      showUndo({
        message: "Moved.",
        onUndo: () => moveScheduledBlock(item.id, originalStart.getTime()),
      });
    }
  }

  function onResizeDown(e: React.PointerEvent<HTMLDivElement>, item: ScheduleItem) {
    if (item.kind === "fixed") return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    resizeInfo.current = { startY: e.clientY, startDurationMs: item.end.getTime() - item.start.getTime() };
    setResizeId(item.id);
  }

  function onResizeMove(e: React.PointerEvent<HTMLDivElement>, item: ScheduleItem) {
    if (resizeId !== item.id || !resizeInfo.current) return;
    e.stopPropagation();
    const deltaMs = ((e.clientY - resizeInfo.current.startY) / rowH) * 3_600_000;
    const newDurationMs = Math.max(MIN_DURATION_MS, resizeInfo.current.startDurationMs + deltaMs);
    setOverrides((prev) => ({ ...prev, [item.id]: { start: item.start, end: new Date(item.start.getTime() + newDurationMs) } }));
  }

  function onResizeUp(item: ScheduleItem) {
    if (resizeId !== item.id || !resizeInfo.current) return;
    const current = overrides[item.id];
    setResizeId(null);
    resizeInfo.current = null;
    if (!current) return;

    const snappedMs = snapDurationMs(current.end.getTime() - current.start.getTime());
    const snappedEnd = new Date(current.start.getTime() + snappedMs);
    setOverrides((prev) => ({ ...prev, [item.id]: { start: item.start, end: snappedEnd } }));

    startTransition(() => {
      resizeScheduledBlock(item.id, snappedMs / 60_000);
    });
  }

  function onBackgroundClick(e: React.MouseEvent<HTMLDivElement>, colIndex: number, date: Date) {
    const rect = e.currentTarget.getBoundingClientRect();
    const rawTop = e.clientY - rect.top;
    const dayTop = dayGridStartFor(date);
    const rawStart = new Date(dayTop.getTime() + (rawTop / rowH) * 3_600_000);
    const start = snapWithinDay(rawStart, QUICK_ADD_DURATION_MS);
    setQuickAdd({ start, colIndex });
  }

  function submitQuickAdd(title: string) {
    if (!quickAdd) return;
    const formData = new FormData();
    formData.set("title", title);
    startTransition(() => {
      createCalendarEventQuick(quickAdd.start.getTime(), formData);
    });
    setQuickAdd(null);
  }

  const display = allItems.map((it) => (overrides[it.id] ? { ...it, ...overrides[it.id] } : it));

  return (
    <div
      ref={containerRef}
      className="relative grid"
      style={{ gridTemplateColumns: "56px repeat(7, 1fr)", gridColumn: "1 / -1" }}
    >
      <div className="relative" style={{ height: totalHours * rowH }}>
        {Array.from({ length: totalHours }, (_, i) => (
          <span key={i} className="font-mono-strobe absolute right-1.5 text-[10px] font-semibold text-ink-dim" style={{ top: i * rowH - 6 }}>
            {String(gridStartHour + i).padStart(2, "0")}:00
          </span>
        ))}
      </div>

      {days.map((d, colIndex) => (
        <div
          key={`bg-${d.key}`}
          onClick={(e) => onBackgroundClick(e, colIndex, d.date)}
          className={`relative border-l border-line ${d.key === todayKey ? "bg-[color-mix(in_srgb,var(--accent)_6%,transparent)]" : ""}`}
          style={{ height: totalHours * rowH }}
        >
          {Array.from({ length: totalHours }, (_, i) => (
            <div key={i} className="pointer-events-none absolute inset-x-0 border-t border-line first:border-t-0" style={{ top: i * rowH }} />
          ))}
        </div>
      ))}

      {display.map((item) => {
        const dragging = dragId === item.id;
        const colIndex = dragging && dragPos ? dragPos.colIndex : colIndexFor(item);
        const top =
          dragging && dragPos
            ? dragPos.top
            : ((item.start.getTime() - dayGridStartFor(days[colIndex].date).getTime()) / 3_600_000) * rowH;
        const height = Math.max(((item.end.getTime() - item.start.getTime()) / 3_600_000) * rowH - 2, 16);
        const resizing = resizeId === item.id;
        const kind = effectiveKind(item);
        return (
          <div
            key={item.id}
            onPointerDown={(e) => onDown(e, item)}
            onPointerMove={(e) => onMove(e, item)}
            onPointerUp={() => onUp(item)}
            title={`${item.title}${item.partTotal ? ` (Part ${item.partIndex} of ${item.partTotal})` : ""} · ${fmtTime(item.start)}–${fmtTime(item.end)}${kind === "atRisk" ? " · AT RISK" : ""}`}
            className={`absolute overflow-hidden rounded-sm border px-1 py-0.5 select-none ${kindClasses(kind)} ${
              item.kind !== "fixed" ? "cursor-grab touch-none active:cursor-grabbing" : ""
            } ${dragging || resizing ? "z-20 opacity-90 shadow-lg" : ""}`}
            style={{
              top,
              height,
              left: `calc(56px + (100% - 56px) * ${colIndex} / 7 + 2px)`,
              width: `calc((100% - 56px) / 7 - 4px)`,
            }}
          >
            {/* Rendered before the title (not after) so a narrow block
                where the two would visually overlap gives the click to
                the title, not the resize handle — see the matching
                comment in DayDragItems above. */}
            {item.kind !== "fixed" ? (
              <ResizeHandle
                onPointerDown={(e) => onResizeDown(e, item)}
                onPointerMove={(e) => onResizeMove(e, item)}
                onPointerUp={() => onResizeUp(item)}
              />
            ) : null}
            <ScheduleItemTitle
              item={item}
              icon={kind === "fixed" ? "🔒 " : kind === "atRisk" ? "⚠ " : ""}
              className={`block w-full truncate text-[10.5px] font-bold ${kind === "atRisk" ? "text-ground" : "text-ink"}`}
            />
          </div>
        );
      })}
      {quickAdd ? (
        <QuickAddPopover
          style={{
            top: ((quickAdd.start.getTime() - dayGridStartFor(days[quickAdd.colIndex].date).getTime()) / 3_600_000) * rowH,
            left: `calc(56px + (100% - 56px) * ${quickAdd.colIndex} / 7 + 2px)`,
          }}
          onSubmit={submitQuickAdd}
          onCancel={() => setQuickAdd(null)}
        />
      ) : null}
    </div>
  );
}
