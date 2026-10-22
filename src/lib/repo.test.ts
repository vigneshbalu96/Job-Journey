import { describe, expect, it } from "vitest";
import { diffRows } from "./repo";

describe("diffRows", () => {
  it("returns only changed keys and ignores updatedAt", () => {
    const before = { id: "1", stage: "saved", priority: 3, updatedAt: new Date(1), when: new Date(5) };
    const after = { id: "1", stage: "applied", priority: 3, updatedAt: new Date(2), when: new Date(5) };
    expect(diffRows(before, after)).toEqual({ before: { stage: "saved" }, after: { stage: "applied" } });
  });
  it("compares dates by value", () => {
    const d = { a: new Date("2026-01-01") };
    expect(diffRows(d, { a: new Date("2026-01-01") })).toEqual({ before: {}, after: {} });
  });
});
