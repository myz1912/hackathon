import type { Brief, MediaProbe } from "../contracts.js";
import { probeMedia } from "../tools/media.js";

export type MediaProbeFunction = (path: string) => Promise<MediaProbe>;
export type MediaToolEvent = (phase: "start" | "end", path: string) => void;

export async function runMediaAnalyst(
  brief: Brief,
  probe: MediaProbeFunction = probeMedia,
  onToolEvent?: MediaToolEvent,
): Promise<MediaProbe[]> {
  return await Promise.all(
    brief.mediaPaths.map(async (path) => {
      onToolEvent?.("start", path);
      try {
        return await probe(path);
      } finally {
        onToolEvent?.("end", path);
      }
    }),
  );
}
