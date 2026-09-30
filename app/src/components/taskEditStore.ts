"use client";

// Shared open/close state for the task edit modal — same
// useSyncExternalStore pattern as taskNoteStore/quickJumpStore.

export type EditTarget = {
  id: string;
  title: string;
  state: "next" | "later" | "stuck" | "waiting";
  energy: "low" | "medium" | "high" | null;
  context: "email" | "calls" | "deep_work" | "admin" | null;
  estimatedMinutes: number | null;
  dueDate: Date | null;
  deadlineType: "hard" | "soft" | null;
};

let active: EditTarget | null = null;
const listeners = new Set<() => void>();

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot() {
  return active;
}

export function getServerSnapshot(): EditTarget | null {
  return null;
}

export function openTaskEdit(target: EditTarget) {
  active = target;
  listeners.forEach((l) => l());
}

export function closeTaskEdit() {
  active = null;
  listeners.forEach((l) => l());
}
