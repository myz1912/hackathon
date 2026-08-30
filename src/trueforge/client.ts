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
    id: requiredString(value, "id"),
    agent: value.agent,
    created_at: requiredString(value, "created_at"),
    updated_at: requiredString(value, "updated_at"),
  };
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

  async getTurn(sessionId: string, turnId: string): Promise<TrueForgeTurn> {
    return asTurn(
      dataFrom(
        await this.#request(
          `/api/v1/sessions/${encodeURIComponent(sessionId)}/turns/${encodeURIComponent(turnId)}`,
        ),
      ),
    );
  }

  async listEvents(sessionId: string): Promise<TrueForgeEvent[]> {
    const data = dataFrom(
      await this.#request(`/api/v1/sessions/${encodeURIComponent(sessionId)}/events?limit=100`),
    );
    if (!Array.isArray(data)) throw new TrueForgeError("TrueForge returned an invalid event list", "INVALID_RESPONSE");
    return data.map((item) => {
      if (!isRecord(item) || !isRecord(item.event) || typeof item.event.type !== "string") {
        throw new TrueForgeError("TrueForge returned an invalid event", "INVALID_RESPONSE");
      }
      return { turn_id: requiredString(item, "turn_id"), event: item.event as TrueForgeEvent["event"] };
    });
  }

  async #request(path: string, init: RequestInit = {}): Promise<unknown> {
    const controller = new AbortController();
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

    const text = await response.text();
    let body: unknown = {};
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        throw new TrueForgeError("TrueForge returned non-JSON output", "INVALID_RESPONSE", response.status, text.slice(0, 2_000));
      }
    }
    if (!response.ok) {
      const message =
        isRecord(body) && isRecord(body.error) && typeof body.error.message === "string"
          ? body.error.message
          : `HTTP ${response.status}`;
      throw new TrueForgeError(`TrueForge HTTP ${response.status}: ${message}`, "HTTP", response.status, text.slice(0, 2_000));
    }
    return body;
  }
}
