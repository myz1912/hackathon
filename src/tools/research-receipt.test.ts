import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
  });
});
