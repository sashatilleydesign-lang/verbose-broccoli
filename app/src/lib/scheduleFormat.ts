import type { ScheduleItem } from "@/lib/schedule";

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function fmtTime(d: Date) {
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function kindClasses(kind: string) {
  if (kind === "atRisk") return "bg-accent border-accent";
  if (kind === "fixed") return "border-line";
  return "border-line bg-[color-mix(in_srgb,var(--accent)_16%,var(--panel))]";
}

export function hourBounds(items: ScheduleItem[]) {
  const hours = items.map((i) => [i.start.getHours(), i.end.getHours() + (i.end.getMinutes() > 0 ? 1 : 0)]).flat();
  const startHour = Math.max(6, Math.min(7, ...(hours.length ? hours : [7])));
  const endHour = Math.min(22, Math.max(19, ...(hours.length ? hours : [19])));
  return { startHour, endHour };
}
