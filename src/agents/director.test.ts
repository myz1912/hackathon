import { describe, expect, it } from "vitest";
import type { Brief, MediaProbe, ResearchReport } from "../contracts.js";
import type { ResearchTool } from "../tools/brightdata.js";
import { runDirector } from "./director.js";

const brief: Brief = {
  goal: "Explain the workflow",
  desiredReaction: "Trust the evidence",
  audience: "developers",
  platform: "tiktok",
  mediaPaths: ["owned.mp4"],
};

const report: ResearchReport = {
  query: "test",
  collectedAt: "2026-08-29T16:00:00.000Z",
  sourceCount: 1,
  findings: [
    {
      url: "https://example.com/source",
      title: "Source",
      publisher: "Example",
      collectedAt: "2026-08-29T16:00:00.000Z",
      pattern: "Show the result first",
      evidence: "The result is visible in the opening frame.",
    },
  ],
};

const probe: MediaProbe = {
  path: "owned.mp4",
  durationSec: 4,
  width: 1080,
  height: 1920,
  hasAudio: true,
};

const delay = async (milliseconds: number): Promise<void> =>
  await new Promise((resolve) => setTimeout(resolve, milliseconds));

describe("runDirector", () => {
  it("records overlapping researcher and media analyst spans", async () => {
    const researchTool: ResearchTool = {
      async search() {
        await delay(35);
        return report;
      },
    };
    const result = await runDirector(brief, {
      researchTool,
      async probeMedia() {
        await delay(35);
        return probe;
      },
    });

    expect(result.status).toBe("awaiting_approval");
    const intervals = ["researcher", "media_analyst"].map((actor) => {
      const start = result.trace.find((event) => event.actor === actor && event.kind === "subagent_started");
      const end = result.trace.find((event) => event.actor === actor && event.kind === "subagent_ended");
      expect(start).toBeDefined();
      expect(end).toBeDefined();
      return { start: Date.parse(start?.t ?? ""), end: Date.parse(end?.t ?? "") };
    });
    const [researcher, analyst] = intervals;
    if (!researcher || !analyst) throw new Error("Expected two subagent intervals");
    expect(researcher.start).toBeLessThan(analyst.end);
    expect(analyst.start).toBeLessThan(researcher.end);
    expect(result.trace.some((event) => event.kind === "approval_requested")).toBe(true);
  });

  it("runs QA and emits a non-external packet after approval", async () => {
    const researchTool: ResearchTool = { async search() { return report; } };
    const result = await runDirector(brief, {
      researchTool,
      async probeMedia() { return probe; },
      approval: { approved: true, reason: "approved in test", approvedDigest: "director-test" },
    });

    expect(result.status).toBe("complete");
    if (result.status !== "complete") throw new Error("Expected completed result");
    expect(result.qa.allPassed).toBe(true);
    expect(result.packet).toMatchObject({ external_action: false, readyToPublish: true });
  });
});
