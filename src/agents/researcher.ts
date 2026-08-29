import type { Brief, ResearchReport } from "../contracts.js";
import type { ResearchTool } from "../tools/brightdata.js";

export type ResearchToolEvent = (phase: "start" | "end", detail: Readonly<Record<string, unknown>>) => void;

export async function runResearcher(
  tool: ResearchTool,
  brief: Brief,
  onToolEvent?: ResearchToolEvent,
): Promise<ResearchReport> {
  const query = `${brief.platform} ${brief.audience} ${brief.goal} short-form format patterns`;
  const detail = { tool: "research.search", argv: [query, "6"] } as const;
  onToolEvent?.("start", detail);
  try {
    return await tool.search(query, 6);
  } finally {
    onToolEvent?.("end", detail);
  }
}
