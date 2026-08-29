import { describe, expect, it } from "vitest";
import { validateEditPlan, type EditPlan, type MediaProbe } from "./contracts.js";

const probe: MediaProbe = {
  path: "owned.mp4",
  durationSec: 5,
  width: 1080,
  height: 1920,
  hasAudio: true,
};

function plan(startSec: number, endSec: number, citations = ["https://example.com/source"]): EditPlan {
  return {
    hook: "Show the result first",
    segments: [{ sourcePath: probe.path, startSec, endSec, reason: "Source-backed choice" }],
    citations,
  };
}

describe("validateEditPlan", () => {
  it("accepts a cited segment inside the probed media bounds", () => {
    expect(validateEditPlan(plan(0, 5), [probe])).toEqual(plan(0, 5));
  });

  it("rejects an out-of-bounds segment", () => {
    expect(() => validateEditPlan(plan(0, 5.1), [probe])).toThrow(/bounds/);
  });

  it("rejects an inverted segment", () => {
    expect(() => validateEditPlan(plan(3, 2), [probe])).toThrow(/positive/);
  });

  it("rejects an uncited segment", () => {
    expect(() => validateEditPlan(plan(0, 2, []), [probe])).toThrow();
  });
});
