import { describe, expect, it, vi } from "vitest";
import { TrueForgeClient, TrueForgeError, type FetchLike } from "./client.js";
import { ensurePostForgeAgent, POSTFORGE_AGENT_NAME } from "./register.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const manifest = { model: { name: "provider/model" } };

describe("TrueForgeClient", () => {
  it("looks up PostForge by name and does not create it twice", async () => {
    const fetchStub = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({ data: [{ id: "agent-1", name: POSTFORGE_AGENT_NAME, manifest }] }),
    );
    const client = new TrueForgeClient({ fetch: fetchStub as unknown as FetchLike });
    const result = await ensurePostForgeAgent(client, {
      name: "provider",
      manifest: { models: [{ name: "model" }] },
    });

    expect(result).toMatchObject({ created: false, agent: { id: "agent-1" } });
    expect(fetchStub).toHaveBeenCalledTimes(1);
    expect(fetchStub.mock.calls[0]?.[1]).not.toMatchObject({ method: "POST" });
  });

  it("creates PostForge with sandbox and dynamic subagents enabled", async () => {
    const fetchStub = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") {
        const spec = JSON.parse(String(init.body)) as { name: string; manifest: typeof manifest };
        return jsonResponse({ data: { id: "agent-1", ...spec } });
      }
      return jsonResponse({ data: [] });
    });
    const client = new TrueForgeClient({ fetch: fetchStub as unknown as FetchLike });

    await expect(
      ensurePostForgeAgent(client, {
        name: "provider",
        manifest: { models: [{ name: "model" }] },
      }),
    ).resolves.toMatchObject({ created: true });

    const body = JSON.parse(String(fetchStub.mock.calls[1]?.[1]?.body)) as Record<string, unknown>;
    expect(body).toMatchObject({
      manifest: {
        config: {
          sandbox: { enabled: true },
          dynamic_sub_agents: { enabled: true },
        },
      },
    });
  });

  it("surfaces a 4xx as a typed error", async () => {
    const client = new TrueForgeClient({
      fetch: vi.fn(async () => jsonResponse({ error: { message: "bad manifest" } }, 422)) as unknown as FetchLike,
    });
    await expect(client.listAgents()).rejects.toMatchObject({
      code: "HTTP",
      status: 422,
      message: "TrueForge HTTP 422: bad manifest",
    });
  });

  it("maps session event items from the response data", async () => {
    const client = new TrueForgeClient({
      fetch: vi.fn(async () =>
        jsonResponse({
          data: [
            {
              turn_id: "turn-1",
              event: { type: "turn.created", id: "event-1", created_at: "2026-08-29T16:00:00.000Z" },
            },
          ],
          pagination: { next_page_token: null },
        }),
      ) as unknown as FetchLike,
    });
    await expect(client.listEvents("session-1")).resolves.toEqual([
      {
        turn_id: "turn-1",
        event: { type: "turn.created", id: "event-1", created_at: "2026-08-29T16:00:00.000Z" },
      },
    ]);
  });

  it("follows event pagination tokens until the trace is complete", async () => {
    const fetchStub = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          data: [{ turn_id: "turn-1", event: { type: "turn.created" } }],
          pagination: { next_page_token: "next-token" },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: [{ turn_id: "turn-2", event: { type: "turn.done" } }],
          pagination: { next_page_token: null },
        }),
      );
    const client = new TrueForgeClient({ fetch: fetchStub as unknown as FetchLike });

    await expect(client.listEvents("session-1")).resolves.toHaveLength(2);
    expect(String(fetchStub.mock.calls[1]?.[0])).toContain("limit=100&page_token=next-token");
  });

  it("rejects an unsafe session id returned by the server", async () => {
    const fetchStub = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ data: [{ id: "agent-1", name: POSTFORGE_AGENT_NAME, manifest }] }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            id: "../../outside",
            agent: {},
            created_at: "2026-08-29T16:00:00.000Z",
            updated_at: "2026-08-29T16:00:00.000Z",
          },
        }),
      );
    const client = new TrueForgeClient({ fetch: fetchStub as unknown as FetchLike });

    await expect(client.createSession("agent-1")).rejects.toThrow("Unsafe identifier");
  });

  it("aborts a streaming turn after an inactive read", async () => {
    const encoder = new TextEncoder();
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode("data: first\n\n"));
      },
      cancel() {
        cancelled = true;
      },
    });
    const client = new TrueForgeClient({
      timeoutMs: 20,
      fetch: vi.fn(async () => new Response(body)) as unknown as FetchLike,
    });
    const reader = (await client.openTurnStream("session-1", "go")).getReader();

    await expect(reader.read()).resolves.toMatchObject({ done: false });
    const stalledRead = reader.read();
    await expect(stalledRead).rejects.toBeInstanceOf(TrueForgeError);
    await expect(stalledRead).rejects.toMatchObject({ code: "TIMEOUT" });
    expect(cancelled).toBe(true);
  });

  it("does not count time spent between stream reads as inactivity", async () => {
    const encoder = new TextEncoder();
    const chunks = [encoder.encode("one"), encoder.encode("two")];
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        const chunk = chunks.shift();
        if (chunk) controller.enqueue(chunk);
        else controller.close();
      },
    });
    const client = new TrueForgeClient({
      timeoutMs: 20,
      fetch: vi.fn(async () => new Response(body)) as unknown as FetchLike,
    });
    const reader = (await client.openTurnStream("session-1", "go")).getReader();

    await expect(reader.read()).resolves.toMatchObject({ value: encoder.encode("one") });
    await new Promise((resolve) => setTimeout(resolve, 40));
    await expect(reader.read()).resolves.toMatchObject({ value: encoder.encode("two") });
  });
});
