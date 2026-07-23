const DAY_MS = 24 * 60 * 60 * 1000;

export function relativePast(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const days = Math.floor(diffMs / DAY_MS);
  if (days <= 0) return "today";
  if (days === 1) return "1d";
  return `${days}d`;
}

export function daysSince(date: Date): number {
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / DAY_MS));
}

export function relativeDeadline(date: Date): string {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.round((startOfTarget.getTime() - startOfToday.getTime()) / DAY_MS);

  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  if (dayDiff < 0) return `was due ${time}`;
  if (dayDiff === 0) return `due today, ${time}`;
  if (dayDiff === 1) return `due tomorrow, ${time}`;
  return `due in ${dayDiff} days`;
}
