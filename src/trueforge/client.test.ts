import { describe, expect, it, vi } from "vitest";
import { TrueForgeClient, type FetchLike } from "./client.js";
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
});
