export interface TraceEvent {
  readonly seq: number;
  readonly t: string;
  readonly actor: string;
  readonly kind: string;
  readonly detail: Readonly<Record<string, unknown>>;
}

export class TraceLog {
  readonly #events: TraceEvent[] = [];

  constructor(initialEvents: readonly TraceEvent[] = []) {
    this.#events.push(...initialEvents);
  }

  append(actor: string, kind: string, detail: Readonly<Record<string, unknown>> = {}): TraceEvent {
    const event = Object.freeze({
      seq: this.#events.length + 1,
      t: new Date().toISOString(),
      actor,
      kind,
      detail: Object.freeze({ ...detail }),
    });
    this.#events.push(event);
    return event;
  }

  snapshot(): readonly TraceEvent[] {
    return Object.freeze([...this.#events]);
  }
}

export function renderTrace(events: readonly TraceEvent[]): string {
  const actorWidth = Math.max(5, ...events.map((event) => event.actor.length));
  const kindWidth = Math.max(4, ...events.map((event) => event.kind.length));
  return events
    .map(
      (event) =>
        `${String(event.seq).padStart(3)}  ${event.t}  ${event.actor.padEnd(actorWidth)}  ${event.kind.padEnd(kindWidth)}  ${JSON.stringify(event.detail)}`,
    )
    .join("\n");
}
