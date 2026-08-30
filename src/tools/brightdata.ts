import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  ResearchFindingSchema,
  ResearchReportSchema,
  type ResearchFinding,
  type ResearchReport,
} from "../contracts.js";
import { assertToolAllowed, ToolDeniedError } from "./policy.js";
import { writeResearchReceipt } from "./research-receipt.js";

export interface ResearchTool {
  search(query: string, limit: number): Promise<ResearchReport>;
}

export type ResearchToolErrorCode = "TIMEOUT" | "EXIT" | "INVALID_OUTPUT" | "READ_ERROR";

export class ResearchToolError extends Error {
  readonly code: ResearchToolErrorCode;
  readonly exitCode: number | null;
  readonly stderr: string;
  receiptPath: string | undefined;
  receiptFailure: unknown = undefined;

  constructor(
    message: string,
    code: ResearchToolErrorCode,
    options: { readonly exitCode?: number | null; readonly stderr?: string } = {},
  ) {
    super(message);
    this.name = "ResearchToolError";
    this.code = code;
    this.exitCode = options.exitCode ?? null;
    this.stderr = options.stderr ?? "";
  }
}

const READ_ONLY_SUBCOMMANDS = new Set(["search", "scrape"]);
const STDERR_LIMIT = 2_000;

export function assertReadOnlySubcommand(subcommand: string): void {
  if (!READ_ONLY_SUBCOMMANDS.has(subcommand)) {
    throw new ResearchToolError(
      `Bright Data subcommand '${subcommand}' is not allowed; permitted: search, scrape`,
      "READ_ERROR",
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function firstString(record: Record<string, unknown>, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return undefined;
}

function collectUrlRecords(value: unknown, records: Record<string, unknown>[]): void {
  if (Array.isArray(value)) {
    for (const item of value) collectUrlRecords(item, records);
    return;
  }
  if (!isRecord(value)) return;
  if (firstString(value, ["url", "link", "sourceUrl", "source_url"])) {
    records.push(value);
    return;
  }
  for (const nested of Object.values(value)) collectUrlRecords(nested, records);
}

function publisherFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Unknown publisher";
  }
}

export function normalizeBrightDataPayload(
  payload: unknown,
  query: string,
  limit: number,
  collectedAt = new Date().toISOString(),
  sourceMode: "live" | "fixture" = "live",
): ResearchReport {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new ResearchToolError("Research limit must be a positive integer", "INVALID_OUTPUT");
  }

  const records: Record<string, unknown>[] = [];
  collectUrlRecords(payload, records);
  const findings: ResearchFinding[] = [];
  const seenUrls = new Set<string>();

  for (const record of records) {
    if (findings.length >= limit) break;
    const url = firstString(record, ["url", "link", "sourceUrl", "source_url"]);
    if (!url || seenUrls.has(url)) continue;
    const title = firstString(record, ["title", "name", "headline"]);
    const evidence = firstString(record, ["evidence", "snippet", "description", "text"]);
    const pattern = firstString(record, ["pattern", "insight", "description", "snippet"]);
    const parsed = ResearchFindingSchema.safeParse({
      url,
      title: title ?? evidence ?? "Untitled source",
      publisher:
        firstString(record, ["publisher", "source", "domain", "displayLink"]) ?? publisherFromUrl(url),
      collectedAt,
      pattern: pattern ?? title ?? "Source retained for review",
      evidence: evidence ?? title ?? "Source retained for review",
    });
    if (!parsed.success) continue;
    seenUrls.add(parsed.data.url);
    findings.push(parsed.data);
  }

  return ResearchReportSchema.parse({
    findings,
    query,
    collectedAt,
    sourceCount: findings.length,
    sourceMode,
  });
}

export interface BrightDataCliOptions {
  readonly binary?: string;
  readonly timeoutMs?: number;
  readonly env?: NodeJS.ProcessEnv;
  readonly spawner?: typeof spawn;
  readonly receiptWriter?: typeof writeResearchReceipt;
}

export interface BrightDataCommandOptions extends BrightDataCliOptions {}

export interface BrightDataCommandResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
}

function credentialFrom(env: NodeJS.ProcessEnv): string | undefined {
  return env.BRIGHT_DATA_API_TOKEN ?? env.BRIGHTDATA_API_KEY;
}

function safeStderr(stderr: string, credential: string | undefined): string {
  const redacted = credential ? stderr.replaceAll(credential, "[REDACTED]") : stderr;
  return redacted.slice(0, STDERR_LIMIT);
}

export async function runBrightDataCommand(
  toolId: string,
  subcommand: string,
  args: readonly string[],
  options: BrightDataCommandOptions = {},
): Promise<BrightDataCommandResult> {
  assertToolAllowed(toolId);
  assertReadOnlySubcommand(subcommand);
  if (toolId !== `brightdata.${subcommand}`) throw new ToolDeniedError(toolId);

  const binary = options.binary ?? "brightdata";
  const timeoutMs = options.timeoutMs ?? 25_000;
  const env = options.env ?? process.env;
  const spawner = options.spawner ?? spawn;
  const credential = credentialFrom(env);
  const commandArgs = [subcommand, ...args];
  // @brightdata/cli reads BRIGHTDATA_API_KEY; keep credentials out of the process argv.
  const commandEnv = credential ? { ...env, BRIGHTDATA_API_KEY: credential } : env;

  return await new Promise<BrightDataCommandResult>((resolve, reject) => {
    const child = spawner(binary, commandArgs, {
      env: commandEnv,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string) => (stdout += chunk));
    child.stderr?.on("data", (chunk: string) => (stderr += chunk));
    child.once("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      const detail = safeStderr(stderr, credential);
      reject(
        new ResearchToolError(`Could not start Bright Data CLI: ${error.message}`, "READ_ERROR", {
          exitCode: null,
          stderr: detail,
        }),
      );
    });
    child.once("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      const detail = safeStderr(stderr, credential);
      if (timedOut) {
        reject(
          new ResearchToolError(`Bright Data CLI timed out after ${timeoutMs}ms`, "TIMEOUT", {
            exitCode: code,
            stderr: detail,
          }),
        );
        return;
      }
      if (code !== 0) {
        reject(
          new ResearchToolError(
            `Bright Data CLI exited ${String(code)}: ${detail.trim() || "no error output"}`,
            "EXIT",
            { exitCode: code, stderr: detail },
          ),
        );
        return;
      }
      resolve({ stdout, stderr: detail, exitCode: 0 });
    });
  });
}

export class BrightDataCli implements ResearchTool {
  readonly #options: Required<Pick<BrightDataCliOptions, "binary" | "timeoutMs" | "env" | "spawner" | "receiptWriter">>;
  lastReceiptPath: string | undefined;

  constructor(options: BrightDataCliOptions = {}) {
    this.#options = {
      binary: options.binary ?? "brightdata",
      timeoutMs: options.timeoutMs ?? 25_000,
      env: options.env ?? process.env,
      spawner: options.spawner ?? spawn,
      receiptWriter: options.receiptWriter ?? writeResearchReceipt,
    };
  }

  async search(query: string, limit: number): Promise<ResearchReport> {
    return (await this.searchWithReceipt(query, limit)).report;
  }

  async searchWithReceipt(
    query: string,
    limit: number,
  ): Promise<{ report: ResearchReport; receiptPath?: string }> {
    const startedAt = Date.now();
    const collectedAt = new Date().toISOString();
    let report: ResearchReport | undefined;
    let failure: ResearchToolError | undefined;
    let exitCode: number | null = null;

    try {
      const result = await runBrightDataCommand("brightdata.search", "search", [query, "--json"], this.#options);
      exitCode = result.exitCode;
      let payload: unknown;
      try {
        payload = JSON.parse(result.stdout);
      } catch (error) {
        throw new ResearchToolError(
          `Bright Data returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
          "INVALID_OUTPUT",
          { exitCode: result.exitCode, stderr: result.stderr },
        );
      }
      report = normalizeBrightDataPayload(payload, query, limit, collectedAt, "live");
    } catch (error) {
      failure =
        error instanceof ResearchToolError
          ? error
          : new ResearchToolError(error instanceof Error ? error.message : String(error), "READ_ERROR");
      exitCode = failure.exitCode;
    }

    let receiptPath: string | undefined;
    try {
      receiptPath = await this.#options.receiptWriter({
        query,
        findings: report?.findings ?? [],
        cliExitCode: exitCode,
        durationMs: Math.max(0, Date.now() - startedAt),
      });
      this.lastReceiptPath = receiptPath;
    } catch (receiptFailure) {
      if (failure) {
        failure.receiptFailure = receiptFailure;
        if (failure.cause === undefined) failure.cause = receiptFailure;
        throw failure;
      }
    }
    if (failure) {
      failure.receiptPath = receiptPath;
      throw failure;
    }
    if (!report) throw new ResearchToolError("Bright Data produced no report", "INVALID_OUTPUT", { exitCode });
    return { report, ...(receiptPath === undefined ? {} : { receiptPath }) };
  }
}

const defaultFixturePath = fileURLToPath(new URL("../../fixtures/research.json", import.meta.url));

export class FixtureResearch implements ResearchTool {
  readonly #fixturePath: string;

  constructor(fixturePath = defaultFixturePath) {
    this.#fixturePath = fixturePath;
  }

  async search(query: string, limit: number): Promise<ResearchReport> {
    let payload: unknown;
    try {
      payload = JSON.parse(await readFile(this.#fixturePath, "utf8"));
    } catch (error) {
      throw new ResearchToolError(
        `Could not read research fixture: ${error instanceof Error ? error.message : String(error)}`,
        "READ_ERROR",
      );
    }
    const fixtureTimestamp =
      isRecord(payload) && typeof payload.collectedAt === "string" && !Number.isNaN(Date.parse(payload.collectedAt))
        ? payload.collectedAt
        : new Date().toISOString();
    return normalizeBrightDataPayload(payload, query, limit, fixtureTimestamp, "fixture");
  }
}

/**
 * The CLI can authenticate via `BRIGHTDATA_API_KEY` or credentials stored on disk by
 * `brightdata login`. Treat a stored login as valid credentials —
 * otherwise a logged-in machine silently degrades to fixtures, which is the exact
 * dishonesty this module exists to prevent.
 */
export function hasStoredLogin(home = os.homedir(), platform = process.platform): boolean {
  const configDir =
    platform === "darwin"
      ? path.join(home, "Library", "Application Support", "brightdata-cli")
      : platform === "win32"
        ? path.join(home, "AppData", "Roaming", "brightdata-cli")
        : path.join(home, ".config", "brightdata-cli");
  try {
    // Verified against @brightdata/cli's credentials loader; never read or expose the key here.
    return fs.existsSync(path.join(configDir, "credentials.json"));
  } catch {
    return false;
  }
}

export function makeResearchTool(
  env: Readonly<Record<string, string | undefined>>,
  storedLogin = hasStoredLogin(),
): ResearchTool {
  const hasEnvKey = Boolean(env.BRIGHT_DATA_API_TOKEN || env.BRIGHTDATA_API_KEY);
  return hasEnvKey || storedLogin
    ? new BrightDataCli({ env: { ...process.env, ...env } })
    : new FixtureResearch();
}
