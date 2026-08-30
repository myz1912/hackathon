import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { TrueForgeClient, type TrueForgeEvent, type TrueForgeTurn } from "./client.js";
import { ensurePostForgeAgent } from "./register.js";
import { sessionArtifactPath } from "./safe-id.js";

async function waitForTerminalTurn(
  client: TrueForgeClient,
  sessionId: string,
  turn: TrueForgeTurn,
): Promise<TrueForgeTurn> {
  let current = turn;
  const deadline = Date.now() + 30_000;
  while (current.state.status === "running" && Date.now() < deadline) {
    await delay(250);
    current = await client.getTurn(sessionId, turn.id);
  }
  if (current.state.status === "running") throw new Error(`TrueForge turn ${turn.id} did not finish within 30s`);
  return current;
}

function eventTime(event: TrueForgeEvent): number | undefined {
  const createdAt = event.event.created_at;
  if (typeof createdAt !== "string") return undefined;
  const value = Date.parse(createdAt);
  return Number.isNaN(value) ? undefined : value;
}

export function summarizeEvents(events: readonly TrueForgeEvent[]): {
  turnCount: number;
  toolCalls: number;
  durationMs: number | null;
} {
  const times = events.map(eventTime).filter((value): value is number => value !== undefined);
  const toolCallIds = new Set<string>();
  for (const { event } of events) {
    const calls = event.tool_calls;
    if (Array.isArray(calls)) {
      for (const call of calls) {
        if (typeof call === "object" && call !== null && "id" in call && typeof call.id === "string") {
          toolCallIds.add(call.id);
        }
      }
    }
    if (typeof event.tool_call_id === "string") toolCallIds.add(event.tool_call_id);
  }
  return {
    turnCount: new Set(events.map((event) => event.turn_id)).size,
    toolCalls: toolCallIds.size,
    durationMs: times.length > 1 ? Math.max(...times) - Math.min(...times) : null,
  };
}

async function main(): Promise<void> {
  const client = new TrueForgeClient();
  const providers = await client.listModelProviders();
  const provider = providers.find((candidate) => candidate.manifest.models.length > 0);
  if (!provider) {
    process.stderr.write("No TrueForge model provider is configured.\n");
    process.stderr.write(
      "Remediation: configure one in TrueForge Settings > Model Providers, then rerun npm run tf:trace.\n",
    );
    process.exitCode = 1;
    return;
  }
  const { agent } = await ensurePostForgeAgent(client, provider);
  const session = await client.createSession(agent.id);
  const turn = await client.createTurn(
    session.id,
    "Give one source-cited short-form video hook. Do not post, upload, or perform any external action.",
  );
  await waitForTerminalTurn(client, session.id, turn);
  const events = await client.listEvents(session.id);
  const artifactDir = join(process.cwd(), "artifacts");
  await mkdir(artifactDir, { recursive: true });
  const path = sessionArtifactPath(artifactDir, "trueforge-session-", session.id);
  await writeFile(path, `${JSON.stringify(events, null, 2)}\n`, "utf8");
  const summary = summarizeEvents(events);
  process.stdout.write(`artifact: ${path}\n`);
  process.stdout.write(`turns: ${summary.turnCount}\n`);
  process.stdout.write(`tool calls: ${summary.toolCalls}\n`);
  process.stdout.write(`duration ms: ${summary.durationMs === null ? "unknown" : summary.durationMs}\n`);
}

try {
  await main();
} catch (error) {
  process.stderr.write("state: error\n");
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
