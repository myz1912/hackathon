import { describe, expect, it } from "vitest";
import { assertReadOnlySubcommand, normalizeBrightDataPayload, ResearchToolError } from "./brightdata.js";

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
  it("permits search and scrape", () => {
    expect(() => assertReadOnlySubcommand("search")).not.toThrow();
    expect(() => assertReadOnlySubcommand("scrape")).not.toThrow();
  });

  it("blocks a non-permitted subcommand", () => {
    expect(() => assertReadOnlySubcommand("scraper")).toThrow(ResearchToolError);
    expect(() => assertReadOnlySubcommand("login")).toThrow(/not allowed/);
  });
});
