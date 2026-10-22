/**
 * Streak = consecutive local days with activity, counted back from today.
 * Yesterday still counts as "alive" so a streak doesn't break before the day
 * has had a chance to happen.
 *
 * @param activeDays  distinct local dates (YYYY-MM-DD), any order
 * @param today       local date string for "now"
 */
export function streakDays(activeDays: Iterable<string>, today: string): number {
  const set = new Set(activeDays);
  if (set.size === 0) return 0;
  let cursor = today;
  if (!set.has(cursor)) {
    cursor = addDays(cursor, -1);
    if (!set.has(cursor)) return 0;
  }
  let n = 0;
  while (set.has(cursor)) {
    n++;
    cursor = addDays(cursor, -1);
  }
  return n;
}

export function addDays(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + delta));
  return t.toISOString().slice(0, 10);
}

/** Local Monday 00:00 of the week containing `now`, as an instant. */
export function startOfLocalWeek(now: Date, offsetMinutes: number): Date {
  const local = new Date(now.getTime() + offsetMinutes * 60_000);
  const dow = (local.getUTCDay() + 6) % 7; // Monday = 0
  const mondayLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - dow);
  return new Date(mondayLocal - offsetMinutes * 60_000);
}
