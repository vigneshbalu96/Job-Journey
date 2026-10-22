import { describe, expect, it } from "vitest";
import { addDays, startOfLocalWeek, streakDays } from "./streak";

describe("streakDays", () => {
  it("counts consecutive days ending today", () => {
    expect(streakDays(["2026-10-05", "2026-10-04", "2026-10-03"], "2026-10-05")).toBe(3);
  });
  it("keeps the streak alive when today has no activity yet", () => {
    expect(streakDays(["2026-10-04", "2026-10-03"], "2026-10-05")).toBe(2);
  });
  it("breaks after a gap", () => {
    expect(streakDays(["2026-10-05", "2026-10-03"], "2026-10-05")).toBe(1);
    expect(streakDays(["2026-10-02"], "2026-10-05")).toBe(0);
    expect(streakDays([], "2026-10-05")).toBe(0);
  });
  it("crosses month boundaries", () => {
    expect(streakDays(["2026-10-01", "2026-09-30", "2026-09-29"], "2026-10-01")).toBe(3);
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("startOfLocalWeek", () => {
  it("returns Monday 00:00 in the zone, as an instant", () => {
    // Monday 5 Oct 2026 21:00 IST = 15:30Z; week starts Mon 00:00 IST = Sun 4 Oct 18:30Z
    const start = startOfLocalWeek(new Date("2026-10-05T15:30:00Z"), 330);
    expect(start.toISOString()).toBe("2026-10-04T18:30:00.000Z");
    // Sunday late evening IST still belongs to the week that began the previous Monday
    const sun = startOfLocalWeek(new Date("2026-10-11T17:00:00Z"), 330); // Sun 22:30 IST
    expect(sun.toISOString()).toBe("2026-10-04T18:30:00.000Z");
  });
});
