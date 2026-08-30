import { assertSafeId } from "./safe-id.js";

export type FetchLike = typeof fetch;

export type TrueForgeErrorCode = "HTTP" | "TIMEOUT" | "NETWORK" | "INVALID_RESPONSE";

export class TrueForgeError extends Error {
  constructor(
    message: string,
    readonly code: TrueForgeErrorCode,
    readonly status: number | null = null,
    readonly responseBody = "",
  ) {
    super(message);
    this.name = "TrueForgeError";
  }
}

export interface AgentManifest {
  readonly model: { readonly name: string; readonly params?: Readonly<Record<string, unknown>> };
  readonly instructions?: string;
  readonly config?: Readonly<Record<string, unknown>>;
}

export interface AgentSpec {
  readonly name: string;
  readonly manifest: AgentManifest;
}

export interface TrueForgeAgent extends AgentSpec {
  readonly id: string;
}

export interface TrueForgeSession {
  readonly id: string;
  readonly agent: Readonly<Record<string, unknown>>;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface TrueForgeEvent {
  readonly turn_id: string;
  readonly event: Readonly<Record<string, unknown>> & { readonly type: string };
}

export interface TrueForgeTurn {
  readonly id: string;
  readonly session_id: string;
  readonly state: Readonly<Record<string, unknown>> & { readonly status: string };
  readonly created_at: string;
}

export interface ModelProvider {
  readonly name: string;
  readonly manifest: {
    readonly models: readonly { readonly name: string; readonly model_id?: string }[];
    readonly [key: string]: unknown;
  };
}

export interface TrueForgeClientOptions {
  readonly baseUrl?: string;
  readonly timeoutMs?: number;
  readonly fetch?: FetchLike;
}

export type ToolApproval =
  | { readonly status: "allow" }
  | { readonly status: "deny"; readonly reason?: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function dataFrom(value: unknown): unknown {
  if (!isRecord(value) || !("data" in value)) {
    throw new TrueForgeError("TrueForge response is missing data", "INVALID_RESPONSE");
  }
  return value.data;
}

function requiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new TrueForgeError(`TrueForge response has no valid ${key}`, "INVALID_RESPONSE");
  }
  return value;
}

function errorDetail(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const cause = error.cause;
  if (cause instanceof AggregateError) {
    const first = cause.errors.find((candidate: unknown): candidate is Error => candidate instanceof Error);
    if (first) return `${error.message}: ${first.message}`;
  }
  return cause instanceof Error && cause.message ? `${error.message}: ${cause.message}` : error.message;
}

function asAgent(value: unknown): TrueForgeAgent {
  if (!isRecord(value) || !isRecord(value.manifest) || !isRecord(value.manifest.model)) {
    throw new TrueForgeError("TrueForge returned an invalid agent", "INVALID_RESPONSE");
  }
  return {
    id: requiredString(value, "id"),
    name: requiredString(value, "name"),
    manifest: value.manifest as unknown as AgentManifest,
  };
}

function asSession(value: unknown): TrueForgeSession {
  if (!isRecord(value) || !isRecord(value.agent)) {
    throw new TrueForgeError("TrueForge returned an invalid session", "INVALID_RESPONSE");
  }
  return {
    id: assertSafeId(requiredString(value, "id")),
    agent: value.agent,
    created_at: requiredString(value, "created_at"),
    updated_at: requiredString(value, "updated_at"),
  };
}

function withInactivityTimeout(
  stream: ReadableStream<Uint8Array>,
  timeoutMs: number,
  abortController: AbortController,
): ReadableStream<Uint8Array> {
  const reader = stream.getReader();
  let closed = false;

  function release(): void {
    try {
      reader.releaseLock();
    } catch {
      // A pending read still owns the lock; cancellation will release it.
    }
  }

  return new ReadableStream<Uint8Array>(
    {
      async pull(controller) {
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          const result = await Promise.race([
            reader.read(),
            new Promise<never>((_resolve, reject) => {
              timer = setTimeout(() => {
                const error = new TrueForgeError(
                  `TrueForge stream was inactive for ${timeoutMs}ms`,
                  "TIMEOUT",
                );
                reject(error);
                abortController.abort(error);
              }, timeoutMs);
            }),
          ]);
          if (result.done) {
            closed = true;
            controller.close();
            release();
            return;
          }
          controller.enqueue(result.value);
        } catch (error) {
          closed = true;
          await reader.cancel(error).catch(() => undefined);
          release();
          controller.error(error);
        } finally {
          if (timer !== undefined) clearTimeout(timer);
        }
      },
      async cancel(reason) {
        if (closed) return;
        closed = true;
        abortController.abort(reason);
        await reader.cancel(reason);
        release();
      },
    },
    { highWaterMark: 0 },
  );
}

function asTurn(value: unknown): TrueForgeTurn {
  if (!isRecord(value) || !isRecord(value.state)) {
    throw new TrueForgeError("TrueForge returned an invalid turn", "INVALID_RESPONSE");
  }
  return {
    id: requiredString(value, "id"),
    session_id: requiredString(value, "session_id"),
    state: { ...value.state, status: requiredString(value.state, "status") },
    created_at: requiredString(value, "created_at"),
  };
}

export class TrueForgeClient {
  readonly #baseUrl: string;
  readonly #timeoutMs: number;
  readonly #fetch: FetchLike;

  constructor(options: TrueForgeClientOptions = {}) {
    this.#baseUrl = (options.baseUrl ?? process.env.TRUEFORGE_BASE_URL ?? "http://localhost:8790").replace(/\/$/, "");
    this.#timeoutMs = options.timeoutMs ?? 5_000;
    this.#fetch = options.fetch ?? fetch;
  }

  async capabilities(): Promise<Readonly<Record<string, unknown>>> {
    const data = dataFrom(await this.#request("/api/v1/capabilities"));
    if (!isRecord(data)) throw new TrueForgeError("TrueForge returned invalid capabilities", "INVALID_RESPONSE");
    return data;
  }

  async listAgents(): Promise<TrueForgeAgent[]> {
    const data = dataFrom(await this.#request("/api/v1/agents"));
    if (!Array.isArray(data)) throw new TrueForgeError("TrueForge returned an invalid agent list", "INVALID_RESPONSE");
    return data.map(asAgent);
  }

  async createAgent(spec: AgentSpec): Promise<TrueForgeAgent> {
    return asAgent(
      dataFrom(
        await this.#request("/api/v1/agents", {
          method: "POST",
          body: JSON.stringify(spec),
        }),
      ),
    );
  }

  async listModelProviders(): Promise<ModelProvider[]> {
    const data = dataFrom(await this.#request("/api/v1/settings/model-providers"));
    if (!Array.isArray(data)) {
      throw new TrueForgeError("TrueForge returned an invalid model-provider list", "INVALID_RESPONSE");
    }
    return data.map((value) => {
      if (!isRecord(value) || !isRecord(value.manifest) || !Array.isArray(value.manifest.models)) {
        throw new TrueForgeError("TrueForge returned an invalid model provider", "INVALID_RESPONSE");
      }
      const models = value.manifest.models.map((model) => {
        if (!isRecord(model)) throw new TrueForgeError("TrueForge returned an invalid model", "INVALID_RESPONSE");
        return {
          name: requiredString(model, "name"),
          ...(typeof model.model_id === "string" ? { model_id: model.model_id } : {}),
        };
      });
      return {
        name: requiredString(value, "name"),
        manifest: { ...value.manifest, models },
      };
    });
  }

  async createSession(agentId: string): Promise<TrueForgeSession> {
    const agent = (await this.listAgents()).find((candidate) => candidate.id === agentId);
    if (!agent) throw new TrueForgeError(`TrueForge agent not found: ${agentId}`, "INVALID_RESPONSE");
    // v0.1.4 creates named sessions by name, not id; resolve the requested id before posting.
    return asSession(
      dataFrom(
        await this.#request("/api/v1/sessions", {
          method: "POST",
          body: JSON.stringify({ agent: { name: agent.name } }),
        }),
      ),
    );
  }

  async createTurn(sessionId: string, content: string): Promise<TrueForgeTurn> {
    assertSafeId(sessionId);
    return asTurn(
      dataFrom(
        await this.#request(`/api/v1/sessions/${encodeURIComponent(sessionId)}/turns`, {
          method: "POST",
          body: JSON.stringify({
            input: [{ type: "user.message", content }],
            stream: false,
          }),
        }),
      ),
    );
  }

  async openTurnStream(sessionId: string, content: string): Promise<ReadableStream<Uint8Array>> {
    assertSafeId(sessionId);
    const controller = new AbortController();
    const response = await this.#requestResponse(
      `/api/v1/sessions/${encodeURIComponent(sessionId)}/turns`,
      {
        method: "POST",
        headers: { accept: "text/event-stream" },
        body: JSON.stringify({
          input: [{ type: "user.message", content }],
        }),
      },
      controller,
    );
    if (!response.body) {
      throw new TrueForgeError("TrueForge streaming turn returned no body", "INVALID_RESPONSE", response.status);
    }
    return withInactivityTimeout(response.body, this.#timeoutMs, controller);
  }

  async submitToolApproval(
    sessionId: string,
    threadId: string,
    toolCallId: string,
    approval: ToolApproval,
  ): Promise<void> {
    assertSafeId(sessionId);
    await this.#request(`/api/v1/sessions/${encodeURIComponent(sessionId)}/turns`, {
      method: "POST",
      body: JSON.stringify({
        input: [
          {
            type: "user.tool_approval",
            thread_id: threadId,
            tool_call_id: toolCallId,
            approval,
          },
        ],
      }),
    });
  }

  async getTurn(sessionId: string, turnId: string): Promise<TrueForgeTurn> {
    assertSafeId(sessionId);
    return asTurn(
      dataFrom(
        await this.#request(
          `/api/v1/sessions/${encodeURIComponent(sessionId)}/turns/${encodeURIComponent(turnId)}`,
        ),
      ),
    );
  }

  async listEvents(sessionId: string): Promise<TrueForgeEvent[]> {
    assertSafeId(sessionId);
    const events: TrueForgeEvent[] = [];
    const seenTokens = new Set<string>();
    let pageToken: string | undefined;

    do {
      const params = new URLSearchParams({ limit: "100" });
      if (pageToken) params.set("page_token", pageToken);
      const response = await this.#request(
        `/api/v1/sessions/${encodeURIComponent(sessionId)}/events?${params}`,
      );
      const data = dataFrom(response);
      if (!Array.isArray(data)) {
        throw new TrueForgeError("TrueForge returned an invalid event list", "INVALID_RESPONSE");
      }
      events.push(
        ...data.map((item) => {
          if (!isRecord(item) || !isRecord(item.event) || typeof item.event.type !== "string") {
            throw new TrueForgeError("TrueForge returned an invalid event", "INVALID_RESPONSE");
          }
          return {
            turn_id: requiredString(item, "turn_id"),
            event: item.event as TrueForgeEvent["event"],
          };
        }),
      );

      const pagination = isRecord(response) && isRecord(response.pagination) ? response.pagination : undefined;
      const next = pagination?.next_page_token;
      if (next !== undefined && next !== null && typeof next !== "string") {
        throw new TrueForgeError("TrueForge returned invalid event pagination", "INVALID_RESPONSE");
      }
      pageToken = typeof next === "string" && next.length > 0 ? next : undefined;
      if (pageToken) {
        if (seenTokens.has(pageToken)) {
          throw new TrueForgeError("TrueForge repeated an event page token", "INVALID_RESPONSE");
        }
        seenTokens.add(pageToken);
      }
    } while (pageToken);

    return events;
  }

  async #request(path: string, init: RequestInit = {}): Promise<unknown> {
    const response = await this.#requestResponse(path, init);
    const text = await response.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      throw new TrueForgeError(
        "TrueForge returned non-JSON output",
        "INVALID_RESPONSE",
        response.status,
        text.slice(0, 2_000),
      );
    }
  }

  async #requestResponse(
    path: string,
    init: RequestInit = {},
    controller = new AbortController(),
  ): Promise<Response> {
    const timeout = setTimeout(() => controller.abort(), this.#timeoutMs);
    let response: Response;
    try {
      response = await this.#fetch(`${this.#baseUrl}${path}`, {
        ...init,
        headers: { "content-type": "application/json", ...init.headers },
        signal: controller.signal,
      });
    } catch (error) {
      const timedOut = controller.signal.aborted;
      throw new TrueForgeError(
        timedOut
          ? `TrueForge request timed out after ${this.#timeoutMs}ms`
          : `TrueForge request failed: ${errorDetail(error)}`,
        timedOut ? "TIMEOUT" : "NETWORK",
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const text = await response.text();
      let body: unknown = {};
      if (text) {
        try {
          body = JSON.parse(text);
        } catch {
          body = {};
        }
      }
      const message =
        isRecord(body) && isRecord(body.error) && typeof body.error.message === "string"
          ? body.error.message
          : `HTTP ${response.status}`;
      throw new TrueForgeError(`TrueForge HTTP ${response.status}: ${message}`, "HTTP", response.status, text.slice(0, 2_000));
    }
    return response;
  }
}
