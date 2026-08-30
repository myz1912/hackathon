import { describe, expect, it } from "vitest";
import { parseSSE } from "./sse.js";

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
});
