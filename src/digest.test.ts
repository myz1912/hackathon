import { describe, expect, it } from "vitest";
import type { EditPlan } from "./contracts.js";
import { canonicalize, planDigest } from "./digest.js";

describe("canonicalize", () => {
  it("is independent of object key insertion order", () => {
    const first: EditPlan = {
      hook: "Show proof first",
      segments: [{ sourcePath: "owned.mp4", startSec: 0, endSec: 2, reason: "Evidence" }],
      citations: ["https://example.com/source"],
    };
    const second = {
      citations: ["https://example.com/source"],
      segments: [{ reason: "Evidence", endSec: 2, startSec: 0, sourcePath: "owned.mp4" }],
      hook: "Show proof first",
    } satisfies EditPlan;

    expect(canonicalize(first)).toBe(canonicalize(second));
    expect(planDigest(first)).toBe(planDigest(second));
  });
});
