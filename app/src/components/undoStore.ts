"use client";

// Shared undo-toast state (§11.12) — same useSyncExternalStore pattern as
// QuickJump/taskNoteStore. Given this app's single-user, low-blast-radius
// nature, a short-lived "Undone" toast with a reverse action after the
// handful of destructive-feeling moments (complete, discard, delete
// fixed event, block drag) covers the realistic "wrong button" case
// without building general-purpose undo/redo history.

export type UndoAction = { message: string; onUndo: () => void };
type ActiveUndo = UndoAction & { toastId: number };

let active: ActiveUndo | null = null;
let nextId = 0;
const listeners = new Set<() => void>();

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot() {
  return active;
}

export function getServerSnapshot(): ActiveUndo | null {
  return null;
}

export function showUndo(action: UndoAction) {
  active = { ...action, toastId: nextId++ };
  listeners.forEach((listener) => listener());
}

// Guarded by toastId so a stale auto-dismiss timer from a replaced toast
// can never clear a newer one that's since taken its place.
export function dismissUndo(toastId: number) {
  if (active?.toastId !== toastId) return;
  active = null;
  listeners.forEach((listener) => listener());
}
