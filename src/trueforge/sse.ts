export interface SSEMessage {
  readonly event?: string;
  readonly data: string;
}

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
): AsyncGenerator<{ event?: string; data: string }> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let complete = false;

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
        buffer = buffer.slice(boundary.index + boundary[0].length);
        const message = parseFrame(frame);
        if (message) yield message;
        boundary = /\r?\n\r?\n/.exec(buffer);
      }
    }

    buffer += decoder.decode();
    if (buffer.length > 0) {
      const message = parseFrame(buffer);
      if (message) yield message;
    }
  } finally {
    if (!complete) await reader.cancel();
    reader.releaseLock();
  }
}
