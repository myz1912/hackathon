export const READ_ONLY_TOOL_IDS = Object.freeze([
  "brightdata.search",
  "brightdata.scrape",
] as const);

const allowedToolIds: ReadonlySet<string> = new Set(READ_ONLY_TOOL_IDS);

export class ToolDeniedError extends Error {
  constructor(toolId: string) {
    super(`Tool '${toolId}' is denied; permitted: ${READ_ONLY_TOOL_IDS.join(", ")}`);
    this.name = "ToolDeniedError";
  }
}

export function assertToolAllowed(toolId: string): void {
  if (!allowedToolIds.has(toolId)) throw new ToolDeniedError(toolId);
}
