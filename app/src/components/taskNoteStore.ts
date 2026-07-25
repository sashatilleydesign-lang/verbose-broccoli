"use client";

// Shared open/close state for the task note modal (DESIGN.md §11.9) —
// same useSyncExternalStore pattern as ModeToggle/QuickJump, since the
// trigger (a task title, clicked from Focus/Weekly/Workspace/Schedule)
// and the modal itself are unrelated components scattered across pages.

export type NoteTarget = { id: string; title: string; note: string | null };

let active: NoteTarget | null = null;
const listeners = new Set<() => void>();

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot() {
  return active;
}

export function getServerSnapshot(): NoteTarget | null {
  return null;
}

export function openTaskNote(target: NoteTarget) {
  active = target;
  listeners.forEach((listener) => listener());
}

export function closeTaskNote() {
  active = null;
  listeners.forEach((listener) => listener());
}
