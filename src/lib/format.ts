import { formatDistanceToNowStrict, format, differenceInCalendarDays } from "date-fns";

export function timeAgo(d: Date | string | null | undefined) {
  if (!d) return "—";
  return formatDistanceToNowStrict(new Date(d), { addSuffix: true });
}

export function daysIn(d: Date | string) {
  return differenceInCalendarDays(new Date(), new Date(d));
}

export function shortDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return format(new Date(d), "d MMM yyyy");
}

export function dateTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  return format(new Date(d), "d MMM yyyy, HH:mm");
}

export function money(v: string | number | null | undefined, currency = "INR") {
  if (v == null || v === "") return "—";
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(n)) return String(v);
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

/** For <input type="date"> and type="datetime-local" values. */
export function toInputDate(d: Date | string | null | undefined) {
  if (!d) return "";
  return format(new Date(d), "yyyy-MM-dd");
}

/** "3800000.00" → "3800000" for edit inputs; keeps real decimals. */
export function toInputMoney(v: string | null | undefined) {
  if (v == null || v === "") return "";
  const n = Number(v);
  return Number.isNaN(n) ? String(v) : String(n);
}
