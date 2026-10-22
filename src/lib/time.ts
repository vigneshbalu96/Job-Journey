/** Small timezone helpers without a heavy dependency. */

function parts(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const map: Record<string, number> = {};
  for (const p of fmt.formatToParts(date)) if (p.type !== "literal") map[p.type] = Number(p.value);
  if (map.hour === 24) map.hour = 0;
  return map;
}

/** Offset in minutes between UTC and the zone at `date` (positive east of UTC). */
export function tzOffsetMinutes(date: Date, timeZone: string) {
  const p = parts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - date.getTime()) / 60_000);
}

/** Local hour (0–23) in the zone. */
export function localHour(date: Date, timeZone: string) {
  return parts(date, timeZone).hour;
}

/** The calendar date in the zone as YYYY-MM-DD. */
export function localDateString(date: Date, timeZone: string) {
  const p = parts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** Instant of 23:59:59.999 of the zone's current day. */
export function endOfLocalDay(date: Date, timeZone: string) {
  const p = parts(date, timeZone);
  const offset = tzOffsetMinutes(date, timeZone);
  return new Date(Date.UTC(p.year, p.month - 1, p.day, 23, 59, 59, 999) - offset * 60_000);
}
