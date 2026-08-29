import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  ResearchFindingSchema,
  ResearchReportSchema,
  type ResearchFinding,
  type ResearchReport,
} from "../contracts.js";

export interface ResearchTool {
  search(query: string, limit: number): Promise<ResearchReport>;
}

export type ResearchToolErrorCode = "TIMEOUT" | "EXIT" | "INVALID_OUTPUT" | "READ_ERROR";

export class ResearchToolError extends Error {
  readonly code: ResearchToolErrorCode;
  readonly exitCode: number | undefined;

  constructor(message: string, code: ResearchToolErrorCode, exitCode?: number) {
    super(message);
    this.name = "ResearchToolError";
    this.code = code;
    this.exitCode = exitCode;
  }
}

const READ_ONLY_SUBCOMMANDS = new Set(["search", "scrape"]);

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
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
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

function validIso(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  return Number.isNaN(Date.parse(value)) ? fallback : value;
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
    const candidate = {
      url,
      title: title ?? evidence ?? "Untitled source",
      publisher:
        firstString(record, ["publisher", "source", "domain", "displayLink"]) ?? publisherFromUrl(url),
      collectedAt: validIso(
        firstString(record, ["collectedAt", "collected_at", "publishedAt", "published_at"]),
        collectedAt,
      ),
      pattern: pattern ?? title ?? "Source retained for review",
      evidence: evidence ?? title ?? "Source retained for review",
    };
    const parsed = ResearchFindingSchema.safeParse(candidate);
    if (!parsed.success) continue;
    seenUrls.add(parsed.data.url);
    findings.push(parsed.data);
  }

  return ResearchReportSchema.parse({
    findings,
    query,
    collectedAt,
    sourceCount: findings.length,
  });
}

interface BrightDataCliOptions {
  readonly binary?: string;
  readonly timeoutMs?: number;
  readonly env?: NodeJS.ProcessEnv;
}

export class BrightDataCli implements ResearchTool {
  readonly #binary: string;
  readonly #timeoutMs: number;
  readonly #env: NodeJS.ProcessEnv;

  constructor(options: BrightDataCliOptions = {}) {
    this.#binary = options.binary ?? "brightdata";
    this.#timeoutMs = options.timeoutMs ?? 15_000;
    this.#env = options.env ?? process.env;
  }

  async search(query: string, limit: number): Promise<ResearchReport> {
    assertReadOnlySubcommand("search");
    const collectedAt = new Date().toISOString();
    const output = await this.#run("search", [query, "--json"]);
    let payload: unknown;
    try {
      payload = JSON.parse(output);
    } catch (error) {
      throw new ResearchToolError(
        `Bright Data returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
        "INVALID_OUTPUT",
      );
    }
    return normalizeBrightDataPayload(payload, query, limit, collectedAt);
  }

  async #run(subcommand: string, args: readonly string[]): Promise<string> {
    assertReadOnlySubcommand(subcommand);
    return await new Promise<string>((resolve, reject) => {
      const child = spawn(this.#binary, [subcommand, ...args], {
        env: this.#env,
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
      });
      let stdout = "";
      let stderr = "";
      let timedOut = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        child.kill("SIGKILL");
      }, this.#timeoutMs);

      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => {
        stdout += chunk;
      });
      child.stderr.on("data", (chunk: string) => {
        stderr += chunk;
      });
      child.once("error", (error) => {
        clearTimeout(timeout);
        reject(new ResearchToolError(`Could not start Bright Data CLI: ${error.message}`, "READ_ERROR"));
      });
      child.once("close", (code) => {
        clearTimeout(timeout);
        if (timedOut) {
          reject(new ResearchToolError(`Bright Data CLI timed out after ${this.#timeoutMs}ms`, "TIMEOUT"));
          return;
        }
        if (code !== 0) {
          const detail = stderr.trim() || "no error output";
          reject(new ResearchToolError(`Bright Data CLI exited ${String(code)}: ${detail}`, "EXIT", code ?? undefined));
          return;
        }
        resolve(stdout);
      });
    });
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
      isRecord(payload) && typeof payload.collectedAt === "string"
        ? validIso(payload.collectedAt, new Date().toISOString())
        : new Date().toISOString();
    return normalizeBrightDataPayload(payload, query, limit, fixtureTimestamp);
  }
}

export function makeResearchTool(env: Readonly<Record<string, string | undefined>>): ResearchTool {
  return env.BRIGHT_DATA_API_TOKEN ? new BrightDataCli({ env: { ...process.env, ...env } }) : new FixtureResearch();
}
