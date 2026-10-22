import { describe, expect, it } from "vitest";
import { renderDigest } from "./render";

const base = { appUrl: "https://jj.test", tz: "Asia/Kolkata", name: "Vignesh B", dateLabel: "Sunday, 4 October" };

describe("renderDigest", () => {
  it("returns null when there is nothing to report", () => {
    expect(renderDigest({ overdue: [], dueToday: [], upcoming: [], followUps: [], stale: [] }, base)).toBeNull();
  });
  it("renders sections, escapes HTML and links into the app", () => {
    const out = renderDigest(
      {
        overdue: [{ id: "t1", kind: "follow_up", title: "Follow up <Acme>", dueAt: new Date("2026-10-03T03:30:00Z"), applicationId: "a1", contactId: null, roleTitle: "SDE", company: "Acme", contactName: null }],
        dueToday: [],
        upcoming: [],
        followUps: [{ id: "c1", fullName: "Riya", nextFollowUpAt: new Date(), company: "Acme", email: null }],
        stale: [],
      },
      base,
    );
    expect(out).not.toBeNull();
    expect(out!.subject).toBe("Today: 1 overdue, 1 to follow up");
    expect(out!.html).toContain("Follow up &lt;Acme&gt;");
    expect(out!.html).toContain("https://jj.test/applications/a1");
    expect(out!.html).toContain("Good morning, Vignesh.");
    expect(out!.text).toContain("- Riya");
  });
});
