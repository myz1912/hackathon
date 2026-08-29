import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { ApprovalGate, ProposedAction } from "./approval.js";
import type { EditPlan, PublishPacket } from "./contracts.js";
import { buildPublishPacket } from "./agents/director.js";
import type { TraceLog } from "./agents/trace.js";

export interface RenderOptions {
  readonly artifactsDir?: string;
  readonly trace?: TraceLog;
}

export interface RenderedPackageResult {
  readonly rendered: true;
  readonly path: string;
  readonly packet: PublishPacket;
  readonly action: ProposedAction;
}

export interface DeniedRenderResult {
  readonly rendered: false;
  readonly reason: "denied";
  readonly action: ProposedAction;
}

export type RenderPackageResult = RenderedPackageResult | DeniedRenderResult;

function planId(plan: EditPlan): string {
  return createHash("sha256").update(JSON.stringify(plan)).digest("hex").slice(0, 12);
}

export async function renderPackage(
  plan: EditPlan,
  gate: ApprovalGate,
  options: RenderOptions = {},
): Promise<RenderPackageResult> {
  const id = planId(plan);
  const artifactsDir = resolve(options.artifactsDir ?? "artifacts");
  const outputDir = resolve(artifactsDir, id);
  const outputPath = resolve(outputDir, "packet.json");
  const action: ProposedAction = Object.freeze({
    tool: "postforge-package-writer",
    argv: Object.freeze(["package", "--output", outputPath]),
    touches: Object.freeze([outputDir, outputPath]),
    description: "Write one local copy-ready packet; no publish, upload, or send",
  });

  options.trace?.append("director", "approval_requested", {
    tool: action.tool,
    argv: action.argv,
    touches: action.touches,
  });
  const decision = await gate.request(action);
  options.trace?.append("human_gate", "approval_decided", {
    approved: decision.approved,
    reason: decision.reason,
    tool: action.tool,
    argv: action.argv,
  });
  if (!decision.approved) return { rendered: false, reason: "denied", action };

  const packet = buildPublishPacket(plan);
  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(packet, null, 2)}\n`, { encoding: "utf8", flag: "w" });
  options.trace?.append("package_writer", "tool_completed", { path: outputPath });
  return { rendered: true, path: outputPath, packet, action };
}
