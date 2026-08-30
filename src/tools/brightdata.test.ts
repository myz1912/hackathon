import { spawn } from "node:child_process";
import { describe, expect, it, vi } from "vitest";
import {
  assertReadOnlySubcommand,
  normalizeBrightDataPayload,
  ResearchToolError,
  runBrightDataCommand,
} from "./brightdata.js";
import { READ_ONLY_TOOL_IDS, ToolDeniedError, assertToolAllowed } from "./policy.js";

describe("normalizeBrightDataPayload", () => {
  it("preserves source URLs and source timestamps while dropping URL-less findings", () => {
    const report = normalizeBrightDataPayload(
      {
        results: [
          {
            url: "https://example.com/one",
            title: "One",
            publisher: "Example",
            collectedAt: "2026-08-20T10:00:00.000Z",
            pattern: "Open with proof",
            evidence: "The proof appears in frame one.",
          },
          {
            title: "No source",
            collectedAt: "2026-08-20T11:00:00.000Z",
            snippet: "This record must be dropped.",
          },
          {
            link: "https://example.org/two",
            title: "Two",
            publisher: "Example.org",
            published_at: "2026-08-20T12:00:00.000Z",
            description: "Keep the pacing tight.",
          },
        ],
      },
      "test query",
      10,
      "2026-08-29T16:00:00.000Z",
    );

    expect(report.findings.map((finding) => finding.url)).toEqual([
      "https://example.com/one",
      "https://example.org/two",
    ]);
    expect(report.findings.map((finding) => finding.collectedAt)).toEqual([
      "2026-08-20T10:00:00.000Z",
      "2026-08-20T12:00:00.000Z",
    ]);
    expect(report.collectedAt).toBe("2026-08-29T16:00:00.000Z");
    expect(report.sourceCount).toBe(2);
  });
});

describe("Bright Data read-only allowlist", () => {
  it("permits each frozen read-only tool ID", () => {
    expect(Object.isFrozen(READ_ONLY_TOOL_IDS)).toBe(true);
    for (const toolId of READ_ONLY_TOOL_IDS) expect(() => assertToolAllowed(toolId)).not.toThrow();
  });

  it.each([
    "brightdata.web_data_amazon_product",
    "brightdata.scraping_browser_navigate",
  ])("denies unlisted tool ID %s", (toolId) => {
    expect(() => assertToolAllowed(toolId)).toThrow(ToolDeniedError);
  });

  it("denies an unlisted tool before spawning a process", async () => {
    const spawner = vi.fn() as unknown as typeof spawn;
    await expect(
      runBrightDataCommand("brightdata.scraping_browser_navigate", "search", ["query"], { spawner }),
    ).rejects.toThrow(ToolDeniedError);
    expect(spawner).not.toHaveBeenCalled();
  });

  it("permits search and scrape", () => {
    expect(() => assertReadOnlySubcommand("search")).not.toThrow();
    expect(() => assertReadOnlySubcommand("scrape")).not.toThrow();
  });

  it("blocks a non-permitted subcommand", () => {
    expect(() => assertReadOnlySubcommand("scraper")).toThrow(ResearchToolError);
    expect(() => assertReadOnlySubcommand("login")).toThrow(/not allowed/);
  });
});
