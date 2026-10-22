import type { TodayData } from "@/lib/queries/today";
import { TASK_KIND_LABEL } from "@/lib/stages";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function fmt(d: Date | null, tz: string) {
  if (!d) return "";
  return new Intl.DateTimeFormat("en-IN", { timeZone: tz, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(d);
}

/** Plain, table-free HTML that renders in every client. Returns null when there is nothing to say. */
export function renderDigest(
  data: TodayData,
  opts: { appUrl: string; tz: string; name: string | null; dateLabel: string; progress?: { appliedThisWeek: number; weeklyTarget: number; streak: number } },
) {
  const total = data.overdue.length + data.dueToday.length + data.followUps.length + data.upcoming.length + data.stale.length;
  if (total === 0) return null;

  const link = (path: string, text: string) => `<a href="${opts.appUrl}${path}" style="color:#2a78d6;text-decoration:none">${esc(text)}</a>`;
  const taskLine = (t: TodayData["overdue"][number]) => {
    const ctx = t.roleTitle ? `${t.roleTitle} @ ${t.company}` : t.contactName ?? "";
    const path = t.applicationId ? `/applications/${t.applicationId}` : t.contactId ? `/contacts/${t.contactId}` : "/today";
    return `<li style="margin:4px 0"><span style="color:#52514e;font-size:11px;text-transform:uppercase">${esc(TASK_KIND_LABEL[t.kind])}</span> ${link(path, t.title)}${ctx ? ` <span style="color:#52514e">· ${esc(ctx)}</span>` : ""} <span style="color:#52514e">· ${fmt(t.dueAt, opts.tz)}</span></li>`;
  };
  const section = (title: string, items: string[], color = "#0b0b0b") =>
    items.length
      ? `<h3 style="margin:20px 0 6px;font-size:14px;color:${color}">${esc(title)} (${items.length})</h3><ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.5">${items.join("")}</ul>`
      : "";

  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#fcfcfb;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#0b0b0b">
<div style="max-width:560px;margin:0 auto">
<p style="font-size:12px;color:#52514e;margin:0 0 4px">Job Journey · ${esc(opts.dateLabel)}</p>
<h2 style="margin:0 0 12px;font-size:20px">${opts.name ? `Good morning, ${esc(opts.name.split(" ")[0])}.` : "Good morning."} ${total} thing${total === 1 ? "" : "s"} for today.</h2>
${opts.progress && opts.progress.weeklyTarget > 0 ? `<p style="margin:0 0 8px;font-size:13px;color:#52514e">This week: <strong style="color:#0b0b0b">${opts.progress.appliedThisWeek} of ${opts.progress.weeklyTarget}</strong> applications${opts.progress.streak ? ` · <strong style="color:#0b0b0b">${opts.progress.streak}-day</strong> streak` : ""}</p>` : ""}
${section("Overdue", data.overdue.map(taskLine), "#b42318")}
${section("Due today", data.dueToday.map(taskLine))}
${section("Contacts to follow up", data.followUps.map((c) => `<li style="margin:4px 0">${link(`/contacts/${c.id}`, c.fullName)}${c.company ? ` <span style="color:#52514e">· ${esc(c.company)}</span>` : ""}</li>`))}
${section("Next 7 days", data.upcoming.map(taskLine))}
${section("Going quiet", data.stale.map((a) => `<li style="margin:4px 0">${link(`/applications/${a.id}`, `${a.title} @ ${a.company}`)} <span style="color:#52514e">· ${a.stage}</span></li>`))}
<p style="margin:28px 0 0;font-size:12px;color:#52514e">${link("/today", "Open Today")} · ${link("/settings", "Change digest time or turn it off")}</p>
</div></body></html>`;

  const text = [
    `Job Journey · ${opts.dateLabel}`,
    ...(data.overdue.length ? ["", "OVERDUE", ...data.overdue.map((t) => `- ${t.title}`)] : []),
    ...(data.dueToday.length ? ["", "DUE TODAY", ...data.dueToday.map((t) => `- ${t.title}`)] : []),
    ...(data.followUps.length ? ["", "FOLLOW UP", ...data.followUps.map((c) => `- ${c.fullName}`)] : []),
    ...(data.upcoming.length ? ["", "NEXT 7 DAYS", ...data.upcoming.map((t) => `- ${t.title}`)] : []),
    ...(data.stale.length ? ["", "GOING QUIET", ...data.stale.map((a) => `- ${a.title} @ ${a.company}`)] : []),
    "",
    `${opts.appUrl}/today`,
  ].join("\n");

  return { html, text, subject: `Today: ${summaryLine(data)}` };
}

function summaryLine(d: TodayData) {
  const parts: string[] = [];
  if (d.overdue.length) parts.push(`${d.overdue.length} overdue`);
  if (d.dueToday.length) parts.push(`${d.dueToday.length} due`);
  if (d.followUps.length) parts.push(`${d.followUps.length} to follow up`);
  if (d.upcoming.length) parts.push(`${d.upcoming.length} upcoming`);
  if (d.stale.length) parts.push(`${d.stale.length} going quiet`);
  return parts.join(", ");
}
