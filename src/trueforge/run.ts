import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { TrueForgeClient } from "./client.js";
import {
  allowAll,
  denyAll,
  promptOnStdin,
  runTurnWithApprovals,
  type ApprovalPolicy,
  type PendingApproval,
} from "./hitl.js";
import { ensurePostForgeAgent } from "./register.js";

type Mode = "allow-all" | "deny-all" | "interactive";

function parseArgs(args: readonly string[]): { message: string; mode: Mode } {
  const modes = new Set<Mode>();
  const messageParts: string[] = [];
  for (const arg of args) {
    if (arg === "--allow-all") modes.add("allow-all");
    else if (arg === "--deny-all") modes.add("deny-all");
    else if (arg === "--interactive") modes.add("interactive");
    else if (arg.startsWith("--")) throw new Error(`Unknown flag: ${arg}`);
    else messageParts.push(arg);
  }
  if (modes.size > 1) throw new Error("Choose only one approval mode");
  const message = messageParts.join(" ").trim();
  if (!message) throw new Error('Usage: npm run tf:run -- "<message>" [--allow-all|--deny-all|--interactive]');
  return { message, mode: modes.values().next().value ?? "allow-all" };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function eventType(value: unknown): string {
  if (isRecord(value) && typeof value.type === "string") return value.type;
  if (isRecord(value) && isRecord(value.event) && typeof value.event.type === "string") return value.event.type;
  return "event";
}

function trace(label: string, detail = ""): void {
  process.stdout.write(`${label.padEnd(24)}${detail}\n`);
}

function toolDetails(value: unknown): string[] {
  if (!isRecord(value) || !Array.isArray(value.tool_calls)) return [];
  return value.tool_calls.flatMap((call) => {
    if (!isRecord(call)) return [];
    const name = isRecord(call.function) && typeof call.function.name === "string"
      ? call.function.name
      : isRecord(call.tool_info) && typeof call.tool_info.name === "string"
        ? call.tool_info.name
        : "<unknown>";
    const id = typeof call.id === "string" ? call.id : "<unknown>";
    return [`${name} ${id}`];
  });
}

function renderEvent(value: unknown): void {
  const type = eventType(value);
  const details = toolDetails(value);
  trace(type, details[0] ?? "");
  for (const detail of details.slice(1)) trace("", detail);
}

function displayArgv(pending: PendingApproval): string {
  return pending.argv === undefined ? "<unavailable>" : JSON.stringify(pending.argv);
}

function policyFor(mode: Mode): ApprovalPolicy {
  if (mode === "deny-all") return denyAll("Denied by --deny-all");
  if (mode === "interactive") return promptOnStdin();
  return allowAll();
}

function tracedPolicy(policy: ApprovalPolicy): ApprovalPolicy {
  return async (pending) => {
    trace("approval.request", `${pending.toolName ?? "<unknown>"} argv=${displayArgv(pending)}`);
    const decision = await policy(pending);
    trace(
      "approval.decision",
      decision.status === "deny" && decision.reason ? `${decision.status} (${decision.reason})` : decision.status,
    );
    return decision;
  };
}

async function main(): Promise<void> {
  const { message, mode } = parseArgs(process.argv.slice(2));
  const client = new TrueForgeClient();
  const providers = await client.listModelProviders();
  const provider = providers.find((candidate) => candidate.manifest.models.length > 0);
  if (!provider) throw new Error("No TrueForge model provider is configured");
  const { agent } = await ensurePostForgeAgent(client, provider);
  const session = await client.createSession(agent.id);

  trace("session.created", session.id);
  const result = await runTurnWithApprovals({
    client,
    sessionId: session.id,
    message,
    policy: tracedPolicy(policyFor(mode)),
    onEvent: renderEvent,
  });

  const artifactDir = join(process.cwd(), "artifacts");
  const artifactPath = join(artifactDir, `turn-${session.id}.json`);
  await mkdir(artifactDir, { recursive: true });
  await writeFile(artifactPath, `${JSON.stringify(result.events, null, 2)}\n`, "utf8");

  trace("artifact", artifactPath);
  process.stdout.write("\nfinal text:\n");
  process.stdout.write(`${result.finalText}\n`);
  process.stdout.write(
    `token usage: input=${result.usage?.input_tokens ?? "unknown"} output=${result.usage?.output_tokens ?? "unknown"}\n`,
  );
  process.stdout.write(`session id: ${result.sessionId}\n`);
}

try {
  await main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
