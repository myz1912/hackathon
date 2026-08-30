import { describe, expect, it, vi } from "vitest";
import { TrueForgeClient, type FetchLike } from "./client.js";
import {
  ApprovalExpiredError,
  MaxApprovalsExceededError,
  allowAll,
  denyAll,
  runTurnWithApprovals,
} from "./hitl.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function sseFrame(event: unknown): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

function responseRequired(toolCallId: string, argv: readonly string[] = ["echo", toolCallId]): unknown {
  return {
    type: "tool.response_required",
    thread_id: "thread-worker",
    tool_call_id: toolCallId,
    tool_name: "exec",
    argv,
  };
}

function doneEvent(): unknown {
  return {
    type: "turn.done",
    state: {
      output: {
        content: "READY",
        usage: { input_tokens: 12, output_tokens: 1 },
      },
    },
  };
}

function scriptedStream(chunks: readonly string[], ordering?: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let index = 0;
  return new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        const chunk = chunks[index];
        if (chunk === undefined) {
          ordering?.push("stream-drained");
          controller.close();
          return;
        }
        ordering?.push(`stream-read-${index + 1}`);
        index += 1;
        controller.enqueue(encoder.encode(chunk));
      },
    },
    { highWaterMark: 0 },
  );
}

function fakeClient(
  chunks: readonly string[],
  approvalResponse?: Response | ((body: Record<string, unknown>) => Response),
  ordering?: string[],
): { client: TrueForgeClient; fetchStub: ReturnType<typeof vi.fn> } {
  let requestCount = 0;
  const fetchStub = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    requestCount += 1;
    if (requestCount === 1) {
      return new Response(scriptedStream(chunks, ordering), {
        headers: { "content-type": "text/event-stream" },
      });
    }

    ordering?.push("approval-post");
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    if (typeof approvalResponse === "function") return approvalResponse(body);
    return approvalResponse ?? jsonResponse({ data: {} });
  });
  return {
    client: new TrueForgeClient({ fetch: fetchStub as unknown as FetchLike }),
    fetchStub,
  };
}

function postedApproval(fetchStub: ReturnType<typeof vi.fn>, call = 1): Record<string, unknown> {
  const body = fetchStub.mock.calls[call]?.[1]?.body;
  return JSON.parse(String(body)) as Record<string, unknown>;
}

describe("runTurnWithApprovals", () => {
  it("posts an approval before draining the rest of the turn stream", async () => {
    const ordering: string[] = [];
    const { client, fetchStub } = fakeClient(
      [sseFrame(responseRequired("call-1")), sseFrame(doneEvent())],
      jsonResponse({ data: {} }),
      ordering,
    );

    const result = await runTurnWithApprovals({
      client,
      sessionId: "session-1",
      message: "go",
      policy: allowAll(),
    });

    expect(ordering.indexOf("approval-post")).toBeLessThan(ordering.indexOf("stream-read-2"));
    expect(fetchStub).toHaveBeenCalledTimes(2);
    expect(postedApproval(fetchStub)).toEqual({
      input: [
        {
          type: "user.tool_approval",
          thread_id: "thread-worker",
          tool_call_id: "call-1",
          approval: { status: "allow" },
        },
      ],
    });
    expect(result).toMatchObject({
      finalText: "READY",
      usage: { input_tokens: 12, output_tokens: 1 },
    });
  });

  it("posts and records a denial with its reason", async () => {
    const { client, fetchStub } = fakeClient([sseFrame(responseRequired("call-deny")), sseFrame(doneEvent())]);

    const result = await runTurnWithApprovals({
      client,
      sessionId: "session-1",
      message: "go",
      policy: denyAll("not safe"),
    });

    expect(postedApproval(fetchStub)).toMatchObject({
      input: [{ approval: { status: "deny", reason: "not safe" } }],
    });
    expect(result.approvals).toHaveLength(1);
    expect(result.approvals[0]?.decision).toEqual({ status: "deny", reason: "not safe" });
  });

  it("raises ApprovalExpiredError when an approval is no longer pending", async () => {
    const { client } = fakeClient(
      [sseFrame(responseRequired("call-expired")), sseFrame(doneEvent())],
      jsonResponse({ error: { message: "no pending approval for tool_call_id 'call-expired'" } }, 409),
    );

    const run = runTurnWithApprovals({
      client,
      sessionId: "session-1",
      message: "go",
      policy: allowAll(),
    });

    await expect(run).rejects.toBeInstanceOf(ApprovalExpiredError);
    await expect(run).rejects.toMatchObject({ toolCallId: "call-expired" });
  });

  it("handles two approval-required events in order", async () => {
    const { client } = fakeClient([
      sseFrame(responseRequired("call-1")),
      sseFrame(responseRequired("call-2")),
      sseFrame(doneEvent()),
    ]);

    const result = await runTurnWithApprovals({
      client,
      sessionId: "session-1",
      message: "go",
      policy: allowAll(),
    });

    expect(result.approvals.map(({ pending }) => pending.toolCallId)).toEqual(["call-1", "call-2"]);
  });

  it("fails explicitly when maxApprovals is exceeded", async () => {
    const { client, fetchStub } = fakeClient([
      sseFrame(responseRequired("call-1")),
      sseFrame(responseRequired("call-2")),
      sseFrame(doneEvent()),
    ]);

    const run = runTurnWithApprovals({
      client,
      sessionId: "session-1",
      message: "go",
      policy: allowAll(),
      maxApprovals: 1,
    });

    await expect(run).rejects.toBeInstanceOf(MaxApprovalsExceededError);
    expect(fetchStub).toHaveBeenCalledTimes(2);
  });
});
