export interface SSEMessage {
  readonly event?: string;
  readonly data: string;
}

export class SseFrameTooLargeError extends Error {
  constructor(
    readonly sizeBytes: number,
    readonly maxFrameBytes: number,
  ) {
    super(`SSE frame is ${sizeBytes} bytes; maximum is ${maxFrameBytes}`);
    this.name = "SseFrameTooLargeError";
  }
}

export interface ParseSSEOptions {
  readonly maxFrameBytes?: number;
}

const DEFAULT_MAX_FRAME_BYTES = 1024 * 1024;

function parseFrame(frame: string): SSEMessage | undefined {
  const data: string[] = [];
  let event: string | undefined;
  let hasField = false;

  for (const line of frame.split(/\r?\n/)) {
    if (line.startsWith(":")) continue;
    const separator = line.indexOf(":");
    const field = separator === -1 ? line : line.slice(0, separator);
    const rawValue = separator === -1 ? "" : line.slice(separator + 1);
    const value = rawValue.startsWith(" ") ? rawValue.slice(1) : rawValue;
    if (field === "data") {
      data.push(value);
      hasField = true;
    } else if (field === "event") {
      event = value;
      hasField = true;
    } else if (field === "id") {
      hasField = true;
    }
  }

  if (!hasField) return undefined;
  return event === undefined ? { data: data.join("\n") } : { event, data: data.join("\n") };
}

export async function* parseSSE(
  stream: ReadableStream<Uint8Array>,
  options: ParseSSEOptions = {},
): AsyncGenerator<{ event?: string; data: string }> {
  const maxFrameBytes = options.maxFrameBytes ?? DEFAULT_MAX_FRAME_BYTES;
  if (!Number.isInteger(maxFrameBytes) || maxFrameBytes < 1) {
    throw new RangeError("maxFrameBytes must be a positive integer");
  }
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  let complete = false;

  const assertFrameSize = (frame: string): void => {
    const size = encoder.encode(frame).byteLength;
    if (size > maxFrameBytes) throw new SseFrameTooLargeError(size, maxFrameBytes);
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        complete = true;
        break;
      }
      buffer += decoder.decode(value, { stream: true });

      let boundary = /\r?\n\r?\n/.exec(buffer);
      while (boundary?.index !== undefined) {
        const frame = buffer.slice(0, boundary.index);
        assertFrameSize(frame);
        buffer = buffer.slice(boundary.index + boundary[0].length);
        const message = parseFrame(frame);
        if (message) yield message;
        boundary = /\r?\n\r?\n/.exec(buffer);
      }
      assertFrameSize(buffer);
    }

    buffer += decoder.decode();
    if (buffer.length > 0) {
      assertFrameSize(buffer);
      const message = parseFrame(buffer);
      if (message) yield message;
    }
  } finally {
    if (!complete) await reader.cancel();
    reader.releaseLock();
  }
}
