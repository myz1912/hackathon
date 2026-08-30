# Spec — streaming HITL runner for TrueForge turns

Senior engineer. Write it, test it, run it, leave it green. No plans, no questions.

## The problem this solves

A TrueForge turn streams SSE. When the agent calls an approval-gated tool, the stream emits
a `tool.response_required` event and the turn **waits**. The approval must be POSTed
**while that turn is still open**. A client that reads the whole stream to completion first
and only then answers gets:

```
thread main: messages[0] no pending approval for tool_call_id '<id>'
```

That is a real bug we hit. The fix is to parse SSE incrementally and answer mid-turn.

## Verified API shapes — use exactly these, do not guess

```
POST /api/v1/sessions                       {"agent":{"name":"<agent-name>"}}
POST /api/v1/sessions/{id}/turns            {"input":[{"type":"user.message","content":"..."}]}
GET  /api/v1/sessions/{id}/events
```

Turn input discriminators: `user.message` | `user.tool_approval` | `user.tool_response`.

**Approval payload (reverse-engineered from the shipped frontend bundle):**
```jsonc
{"input":[{
  "type":"user.tool_approval",
  "thread_id":"main",
  "tool_call_id":"call_...",
  "approval":{"status":"allow"}          // or {"status":"deny","reason":"..."}
}]}
```
`status` is a discriminated union of exactly `"allow"` | `"deny"`; `reason` is optional and
only meaningful on deny.

Base URL: `http://localhost:8790`. **TrueForge binds IPv6 localhost — `127.0.0.1` fails.**

## Build

### `src/trueforge/sse.ts`
`export async function* parseSSE(stream: ReadableStream<Uint8Array>): AsyncGenerator<{event?: string; data: string}>`
- Incremental. Split on `\n\n`, handle `data:` / `id:` / `event:` lines, buffer partial frames
  across chunk boundaries, tolerate CRLF, ignore comment lines (`:` prefix).
- Must not accumulate the whole stream in memory.

### `src/trueforge/hitl.ts`
```ts
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

export async function runTurnWithApprovals(opts: {
  client: TrueForgeClient;          // reuse the existing one
  sessionId: string;
  message: string;
  policy: ApprovalPolicy;
  onEvent?: (e: unknown) => void;   // for live CLI rendering
  maxApprovals?: number;            // default 25 — a runaway guard, not a limit to hide
}): Promise<RunTurnResult>;
```

Behaviour:
- Open the turn, parse SSE incrementally.
- On an event carrying `tool.response_required`, extract every `tool_call_id` **and** the
  thread id from the event (do not hardcode `"main"` — read it, fall back to `"main"` only
  if absent).
- Call `policy` for each, then POST the approval **immediately**, before continuing to read.
- Record every `{pending, decision}` pair in order.
- If the POST is rejected because the approval is no longer pending, throw a distinct
  `ApprovalExpiredError` carrying the tool call id — **never** silently continue as if
  approved.
- Extract `finalText` and `usage` from the terminal `turn.done` event.

Policies to export:
- `allowAll()` — for automation
- `denyAll(reason)` — for testing the refusal path
- `allowListed(predicate)` — allow only when the predicate accepts the pending action
- `promptOnStdin()` — prints the tool name and **exact argv**, reads `y`/`n`

### `src/trueforge/run.ts` — `npm run tf:run -- "<message>"`
Flags: `--allow-all` (default), `--deny-all`, `--interactive`.
Prints a live, aligned trace: subagent/tool events as they arrive, each approval with its
**exact argv**, and the decision taken. Ends with the final text, token usage and the
session id. Writes the raw events to `artifacts/turn-<sessionId>.json`.

### Tests — `src/trueforge/hitl.test.ts`, `src/trueforge/sse.test.ts`
No network. Build a fake `fetch` returning a scripted SSE stream.
- SSE parser: frames split across chunk boundaries reassemble correctly; CRLF handled;
  comments ignored; multi-line `data:` concatenated.
- An approval-required event triggers exactly one POST **before** the stream is drained
  (assert call ordering, not just call count).
- `denyAll` posts `{"status":"deny","reason":...}` and the run records the denial.
- A rejected approval POST raises `ApprovalExpiredError` and does **not** resolve as allowed.
- Two approval-required events in one turn produce two approvals in order.
- `maxApprovals` is enforced and surfaces as an explicit error rather than a silent stop.

## Run and report real output
```bash
npx tsc --noEmit
npx vitest run
npm run tf:run -- "Say READY and nothing else."      # smoke, against the live server
```
Do not weaken an existing test. Report exactly what each command printed.
