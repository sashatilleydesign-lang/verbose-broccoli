"use client";

// Shared open/close state for the quick-jump palette (DESIGN.md §11.2) —
// same useSyncExternalStore pattern as ModeToggle, since the trigger
// (Sidebar, MobileNav, a global Cmd+K listener) and the palette itself
// are separate components that don't otherwise share state.

let isOpen = false;
const listeners = new Set<() => void>();

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot() {
  return isOpen;
}

export function getServerSnapshot() {
  return false;
}

function setOpen(next: boolean) {
  isOpen = next;
  listeners.forEach((listener) => listener());
}

export function openQuickJump() {
  setOpen(true);
}

export function closeQuickJump() {
  setOpen(false);
}

export function toggleQuickJump() {
  setOpen(!isOpen);
}
