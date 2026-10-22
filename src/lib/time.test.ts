import { describe, expect, it } from "vitest";
import { endOfLocalDay, localDateString, localHour, tzOffsetMinutes } from "./time";

describe("time helpers", () => {
  const t = new Date("2026-10-04T20:30:00Z"); // 02:00 next day in Kolkata
  it("computes offsets and local hour", () => {
    expect(tzOffsetMinutes(t, "Asia/Kolkata")).toBe(330);
    expect(localHour(t, "Asia/Kolkata")).toBe(2);
    expect(localHour(t, "UTC")).toBe(20);
  });
  it("knows the local calendar date", () => {
    expect(localDateString(t, "Asia/Kolkata")).toBe("2026-10-05");
    expect(localDateString(t, "America/Los_Angeles")).toBe("2026-10-04");
  });
  it("ends the local day at 23:59:59.999 in that zone", () => {
    const end = endOfLocalDay(t, "Asia/Kolkata");
    expect(end.toISOString()).toBe("2026-10-05T18:29:59.999Z");
  });
});
