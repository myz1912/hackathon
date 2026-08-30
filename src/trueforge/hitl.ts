import { createInterface } from "node:readline/promises";
import { TrueForgeClient, TrueForgeError } from "./client.js";
import { parseSSE } from "./sse.js";

export type ApprovalDecision =
  | { status: "allow" }
  | { status: "deny"; reason?: string };

export interface PendingApproval {
  toolCallId: string;
  threadId: string;
  toolName?: string;
  argv?: readonly string[];
  raw: unknown;
}

export type ApprovalPolicy = (p: PendingApproval) => Promise<ApprovalDecision> | ApprovalDecision;

export interface RunTurnResult {
  readonly sessionId: string;
  readonly events: readonly unknown[];
  readonly approvals: readonly { pending: PendingApproval; decision: ApprovalDecision }[];
  readonly finalText: string;
  readonly usage?: { input_tokens?: number; output_tokens?: number };
}

export class ApprovalExpiredError extends Error {
  constructor(readonly toolCallId: string, options?: ErrorOptions) {
    super(`Approval is no longer pending for tool call '${toolCallId}'`, options);
    this.name = "ApprovalExpiredError";
  }
}

export class MaxApprovalsExceededError extends Error {
  constructor(readonly maxApprovals: number) {
    super(`Maximum approval count of ${maxApprovals} exceeded`);
    this.name = "MaxApprovalsExceededError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown): readonly string[] | undefined {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : undefined;
}

function argumentsRecord(value: unknown): Record<string, unknown> | undefined {
  if (isRecord(value)) return value;
  if (typeof value !== "string") return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function toolNameFrom(record: Record<string, unknown>): string | undefined {
  if (typeof record.tool_name === "string") return record.tool_name;
  if (isRecord(record.function) && typeof record.function.name === "string") return record.function.name;
  if (isRecord(record.tool) && typeof record.tool.name === "string") return record.tool.name;
  if (isRecord(record.tool_info) && typeof record.tool_info.name === "string") return record.tool_info.name;
  return undefined;
}

function argvFrom(record: Record<string, unknown>): readonly string[] | undefined {
  const direct = stringArray(record.argv);
  if (direct) return direct;

  const candidates = [record.arguments, isRecord(record.function) ? record.function.arguments : undefined];
  for (const candidate of candidates) {
    const args = argumentsRecord(candidate);
    const argv = args ? stringArray(args.argv) : undefined;
    if (argv) return argv;
  }
  return undefined;
}

function typedRecords(value: unknown, type: string, frameEvent?: string): Record<string, unknown>[] {
  const matches: Record<string, unknown>[] = [];
  const visit = (candidate: unknown, isRoot: boolean): void => {
    if (Array.isArray(candidate)) {
      for (const item of candidate) visit(item, false);
      return;
    }
    if (!isRecord(candidate)) return;
    if (candidate.type === type || (isRoot && frameEvent === type)) matches.push(candidate);
    for (const nested of Object.values(candidate)) visit(nested, false);
  };
  visit(value, true);
  return matches;
}

function approvalsFrom(record: Record<string, unknown>, raw: unknown): PendingApproval[] {
  const pending: PendingApproval[] = [];
  const seen = new Set<string>();

  const visit = (value: unknown, inheritedThreadId: string | undefined, inToolCalls: boolean): void => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item, inheritedThreadId, inToolCalls);
      return;
    }
    if (!isRecord(value)) return;

    const threadId = typeof value.thread_id === "string" ? value.thread_id : inheritedThreadId;
    const toolCallId =
      typeof value.tool_call_id === "string"
        ? value.tool_call_id
        : inToolCalls && typeof value.id === "string"
          ? value.id
          : undefined;
    if (toolCallId && !seen.has(toolCallId)) {
      seen.add(toolCallId);
      const toolName = toolNameFrom(value) ?? toolNameFrom(record);
      const argv = argvFrom(value) ?? argvFrom(record);
      pending.push({
        toolCallId,
        threadId: threadId ?? "main",
        ...(toolName === undefined ? {} : { toolName }),
        ...(argv === undefined ? {} : { argv }),
        raw,
      });
    }

    for (const [key, nested] of Object.entries(value)) {
      visit(nested, threadId, key === "tool_calls");
    }
  };

  visit(record, typeof record.thread_id === "string" ? record.thread_id : undefined, false);
  return pending;
}

function isExpiredApproval(error: unknown): boolean {
  if (!(error instanceof TrueForgeError) || error.code !== "HTTP") return false;
  if (error.status === 409 || error.status === 410) return true;
  return /no pending approval|not pending|approval.+expired/i.test(`${error.message}\n${error.responseBody}`);
}

function outputFromDone(record: Record<string, unknown>): Record<string, unknown> | undefined {
  if (isRecord(record.state) && isRecord(record.state.output)) return record.state.output;
  return isRecord(record.output) ? record.output : undefined;
}

function textFromDone(record: Record<string, unknown>): string | undefined {
  const output = outputFromDone(record);
  if (output && typeof output.content === "string") return output.content;
  if (typeof record.finalText === "string") return record.finalText;
  if (typeof record.final_text === "string") return record.final_text;
  return typeof record.content === "string" ? record.content : undefined;
}

function usageFromDone(
  record: Record<string, unknown>,
): { input_tokens?: number; output_tokens?: number } | undefined {
  const output = outputFromDone(record);
  const usage = output && isRecord(output.usage) ? output.usage : isRecord(record.usage) ? record.usage : undefined;
  if (!usage) return undefined;
  const inputTokens = typeof usage.input_tokens === "number" ? usage.input_tokens : undefined;
  const outputTokens = typeof usage.output_tokens === "number" ? usage.output_tokens : undefined;
  if (inputTokens === undefined && outputTokens === undefined) return undefined;
  return {
    ...(inputTokens === undefined ? {} : { input_tokens: inputTokens }),
    ...(outputTokens === undefined ? {} : { output_tokens: outputTokens }),
  };
}

function parseEventData(data: string): unknown | undefined {
  if (data === "" || data === "[DONE]") return undefined;
  try {
    return JSON.parse(data) as unknown;
  } catch (error) {
    throw new Error("TrueForge SSE event contained invalid JSON", { cause: error });
  }
}

export async function runTurnWithApprovals(opts: {
  client: TrueForgeClient;
  sessionId: string;
  message: string;
  policy: ApprovalPolicy;
  onEvent?: (e: unknown) => void;
  maxApprovals?: number;
}): Promise<RunTurnResult> {
  const maxApprovals = opts.maxApprovals ?? 25;
  if (!Number.isInteger(maxApprovals) || maxApprovals < 0) {
    throw new RangeError("maxApprovals must be a non-negative integer");
  }

  const events: unknown[] = [];
  const approvals: { pending: PendingApproval; decision: ApprovalDecision }[] = [];
  let finalText = "";
  let usage: { input_tokens?: number; output_tokens?: number } | undefined;
  const stream = await opts.client.openTurnStream(opts.sessionId, opts.message);

  for await (const message of parseSSE(stream)) {
    const event = parseEventData(message.data);
    if (event === undefined) continue;
    events.push(event);
    opts.onEvent?.(event);

    for (const required of typedRecords(event, "tool.response_required", message.event)) {
      for (const pending of approvalsFrom(required, event)) {
        if (approvals.length >= maxApprovals) throw new MaxApprovalsExceededError(maxApprovals);
        const decision = await opts.policy(pending);
        if (decision.status !== "allow" && decision.status !== "deny") {
          throw new TypeError(`Invalid approval decision for tool call '${pending.toolCallId}'`);
        }
        try {
          await opts.client.submitToolApproval(
            opts.sessionId,
            pending.threadId,
            pending.toolCallId,
            decision,
          );
        } catch (error) {
          if (isExpiredApproval(error)) throw new ApprovalExpiredError(pending.toolCallId, { cause: error });
          throw error;
        }
        approvals.push({ pending, decision });
      }
    }

    const done = typedRecords(event, "turn.done", message.event).at(-1);
    if (done) {
      finalText = textFromDone(done) ?? finalText;
      usage = usageFromDone(done) ?? usage;
    }
  }

  return {
    sessionId: opts.sessionId,
    events,
    approvals,
    finalText,
    ...(usage === undefined ? {} : { usage }),
  };
}

export function allowAll(): ApprovalPolicy {
  return () => ({ status: "allow" });
}

export function denyAll(reason?: string): ApprovalPolicy {
  return () => ({ status: "deny", ...(reason === undefined ? {} : { reason }) });
}

export function allowListed(predicate: (pending: PendingApproval) => boolean): ApprovalPolicy {
  return (pending) =>
    predicate(pending)
      ? { status: "allow" }
      : { status: "deny", reason: "Action is not allow-listed" };
}

function displayArgv(pending: PendingApproval): string {
  return pending.argv === undefined ? "<unavailable>" : JSON.stringify(pending.argv);
}

export function promptOnStdin(): ApprovalPolicy {
  return async (pending) => {
    const readline = createInterface({ input: process.stdin, output: process.stdout });
    try {
      process.stdout.write(`tool: ${pending.toolName ?? "<unknown>"}\nargv: ${displayArgv(pending)}\n`);
      const answer = await readline.question("Allow? [y/n] ");
      return answer.trim().toLowerCase() === "y"
        ? { status: "allow" }
        : { status: "deny", reason: "Denied interactively" };
    } finally {
      readline.close();
    }
  };
}
