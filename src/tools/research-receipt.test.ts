import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { describe, expect, it } from "vitest";
import { ResearchReceiptSchema, writeResearchReceipt } from "./research-receipt.js";

describe("research receipt", () => {
  it("writes a schema-valid provenance receipt", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "postforge-receipt-"));
    const path = await writeResearchReceipt(
      {
        query: "short form hooks",
        findings: [
          {
            url: "https://example.com/source",
            publisher: "example.com",
            title: "Source",
            collectedAt: "2026-08-29T16:00:00.000Z",
            pattern: "Lead with proof",
            evidence: "Proof is visible immediately",
          },
        ],
        cliExitCode: 0,
        durationMs: 42,
      },
      { rootDir, timestamp: "2026-08-29T16:00:01.000Z" },
    );
    const receipt = ResearchReceiptSchema.parse(JSON.parse(await readFile(path, "utf8")));
    expect(receipt).toEqual({
      createdAt: "2026-08-29T16:00:01.000Z",
      query: "short form hooks",
      sourceMode: "live",
      findings: [
        {
          url: "https://example.com/source",
          publisher: "example.com",
          collectedAt: "2026-08-29T16:00:00.000Z",
        },
      ],
      cliExitCode: 0,
      durationMs: 42,
    });
    expect(basename(path)).not.toMatch(/[<>:"/\\|?*]/);
  });

  it("uses unique filenames for receipts created in the same millisecond", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "postforge-receipt-"));
    const input = { query: "hooks", findings: [], cliExitCode: 0, durationMs: 1 };
    const options = { rootDir, timestamp: "2026-08-29T16:00:01.000Z" };

    const first = await writeResearchReceipt(input, options);
    const second = await writeResearchReceipt(input, options);

    expect(first).not.toBe(second);
    await expect(readFile(first, "utf8")).resolves.toContain('"createdAt": "2026-08-29T16:00:01.000Z"');
    await expect(readFile(second, "utf8")).resolves.toContain('"createdAt": "2026-08-29T16:00:01.000Z"');
  });
});
