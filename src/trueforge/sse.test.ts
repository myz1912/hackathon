import { describe, expect, it } from "vitest";
import { parseSSE, SseFrameTooLargeError } from "./sse.js";

function chunkedStream(chunks: readonly string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

async function collect(stream: ReadableStream<Uint8Array>): Promise<{ event?: string; data: string }[]> {
  const messages: { event?: string; data: string }[] = [];
  for await (const message of parseSSE(stream)) messages.push(message);
  return messages;
}

describe("parseSSE", () => {
  it("reassembles frames split across chunk boundaries", async () => {
    const messages = await collect(
      chunkedStream(["event: tool.resp", "onse_required\ndata: {\"tool_", "call_id\":\"call-1\"}\n\n"]),
    );

    expect(messages).toEqual([
      { event: "tool.response_required", data: '{"tool_call_id":"call-1"}' },
    ]);
  });

  it("handles CRLF, ignores comments, and joins multi-line data", async () => {
    const messages = await collect(
      chunkedStream([
        ": keep-alive\r\nid: event-1\r\nevent: turn.done\r\ndata: first line\r\ndata: second line\r\n\r\n",
        ": comment only\r\n\r\n",
      ]),
    );

    expect(messages).toEqual([{ event: "turn.done", data: "first line\nsecond line" }]);
  });

  it("cancels and rejects a stream whose undelimited frame exceeds the limit", async () => {
    const encoder = new TextEncoder();
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode("data: 123456789"));
      },
      cancel() {
        cancelled = true;
      },
    });

    await expect(collectWithLimit(stream, 8)).rejects.toBeInstanceOf(SseFrameTooLargeError);
    expect(cancelled).toBe(true);
  });
});

async function collectWithLimit(
  stream: ReadableStream<Uint8Array>,
  maxFrameBytes: number,
): Promise<{ event?: string; data: string }[]> {
  const messages: { event?: string; data: string }[] = [];
  for await (const message of parseSSE(stream, { maxFrameBytes })) messages.push(message);
  return messages;
}
