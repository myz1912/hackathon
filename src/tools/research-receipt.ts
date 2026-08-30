import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import type { ResearchFinding } from "../contracts.js";

const isoTimestamp = z.iso.datetime({ offset: true });

export const ResearchReceiptSchema = z
  .object({
    query: z.string().trim().min(1),
    sourceMode: z.literal("live"),
    findings: z.array(
      z
        .object({
          url: z.url(),
          publisher: z.string().trim().min(1),
          collectedAt: isoTimestamp,
        })
        .strict(),
    ),
    cliExitCode: z.number().int().nullable(),
    durationMs: z.number().int().nonnegative(),
  })
  .strict();

export type ResearchReceipt = z.infer<typeof ResearchReceiptSchema>;

export interface WriteResearchReceiptOptions {
  readonly rootDir?: string;
  readonly timestamp?: string;
}

export async function writeResearchReceipt(
  input: {
    readonly query: string;
    readonly findings: readonly ResearchFinding[];
    readonly cliExitCode: number | null;
    readonly durationMs: number;
  },
  options: WriteResearchReceiptOptions = {},
): Promise<string> {
  const timestamp = options.timestamp ?? new Date().toISOString();
  const receipt = ResearchReceiptSchema.parse({
    query: input.query,
    sourceMode: "live",
    findings: input.findings.map(({ url, publisher, collectedAt }) => ({ url, publisher, collectedAt })),
    cliExitCode: input.cliExitCode,
    durationMs: input.durationMs,
  });
  const rootDir = options.rootDir ?? join(process.cwd(), "artifacts", "receipts");
  const path = join(rootDir, `${timestamp}.json`);
  await mkdir(rootDir, { recursive: true });
  await writeFile(path, `${JSON.stringify(receipt, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  return path;
}
