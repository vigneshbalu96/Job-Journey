import { describe, expect, it } from "vitest";
import { followUpDueAt, validateTransition } from "./stages";

describe("validateTransition", () => {
  it("allows forward and backward moves between open stages", () => {
    expect(validateTransition({ from: "saved", to: "applied" })).toEqual({ ok: true });
    expect(validateTransition({ from: "interview", to: "screening" })).toEqual({ ok: true });
  });
  it("requires a reason to close", () => {
    expect(validateTransition({ from: "offer", to: "closed" }).ok).toBe(false);
    expect(validateTransition({ from: "offer", to: "closed", closeReason: "accepted" })).toEqual({ ok: true });
  });
  it("rejects a close reason on open stages", () => {
    expect(validateTransition({ from: "saved", to: "applied", closeReason: "rejected" }).ok).toBe(false);
  });
  it("rejects a no-op move except logging another interview round", () => {
    expect(validateTransition({ from: "applied", to: "applied" }).ok).toBe(false);
    expect(validateTransition({ from: "interview", to: "interview" })).toEqual({ ok: true });
  });
  it("allows reopening a closed application", () => {
    expect(validateTransition({ from: "closed", to: "interview" })).toEqual({ ok: true });
  });
});

describe("followUpDueAt", () => {
  const entered = new Date("2026-10-04T15:30:00Z");
  it("uses defaults per stage and snaps to 09:00 local", () => {
    const due = followUpDueAt("applied", entered);
    expect(due).not.toBeNull();
    expect(due!.getHours()).toBe(9);
    expect(due!.getDate()).toBe(new Date(entered).getDate() + 7);
  });
  it("honours profile overrides and returns null for stages without follow-ups", () => {
    expect(followUpDueAt("applied", entered, { applied: 2 })!.getDate()).toBe(entered.getDate() + 2);
    expect(followUpDueAt("saved", entered)).toBeNull();
    expect(followUpDueAt("closed", entered)).toBeNull();
  });
});
