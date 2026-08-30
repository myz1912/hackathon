import { spawn, type ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import {
  assertReadOnlySubcommand,
  BrightDataCli,
  FixtureResearch,
  makeResearchTool,
  normalizeBrightDataPayload,
  ResearchToolError,
  runBrightDataCommand,
} from "./brightdata.js";
import { READ_ONLY_TOOL_IDS, ToolDeniedError, assertToolAllowed } from "./policy.js";

describe("normalizeBrightDataPayload", () => {
  it("preserves source URLs, stamps fetch time, and drops URL-less findings", () => {
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
      "2026-08-29T16:00:00.000Z",
      "2026-08-29T16:00:00.000Z",
    ]);
    expect(report.collectedAt).toBe("2026-08-29T16:00:00.000Z");
    expect(report.sourceCount).toBe(2);
    expect(report.sourceMode).toBe("live");
  });
});

function fakeSpawner(result: { stdout?: string; stderr?: string; code: number | null }): typeof spawn {
  return vi.fn(() => {
    const child = new EventEmitter() as ChildProcess;
    const stdout = new PassThrough();
    const stderr = new PassThrough();
    Object.assign(child, { stdout, stderr, kill: vi.fn(() => true) });
    queueMicrotask(() => {
      if (result.stdout) stdout.write(result.stdout);
      if (result.stderr) stderr.write(result.stderr);
      stdout.end();
      stderr.end();
      child.emit("close", result.code, null);
    });
    return child;
  }) as unknown as typeof spawn;
}

describe("BrightDataCli", () => {
  it("surfaces non-zero exit without returning fixtures", async () => {
    const receiptWriter = vi.fn(async () => "/tmp/failed-receipt.json");
    const tool = new BrightDataCli({
      env: { BRIGHT_DATA_API_TOKEN: "secret-test-token" },
      spawner: fakeSpawner({ code: 9, stderr: "upstream rejected request" }),
      receiptWriter,
    });

    await expect(tool.search("hooks", 3)).rejects.toMatchObject({
      code: "EXIT",
      exitCode: 9,
      stderr: "upstream rejected request",
    });
    expect(receiptWriter).toHaveBeenCalledWith(
      expect.objectContaining({ findings: [], cliExitCode: 9 }),
    );
  });

  it("uses fixture provenance when credentials are absent", async () => {
    const tool = makeResearchTool({}, false);
    expect(tool).toBeInstanceOf(FixtureResearch);
    const report = await tool.search("hooks", 1);
    expect(report.sourceMode).toBe("fixture");
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
