import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { ApprovalGate, ProposedAction } from "./approval.js";
import { EditPlanSchema, type EditPlan, type PublishPacket } from "./contracts.js";
import { buildPublishPacket } from "./agents/director.js";
import type { TraceLog } from "./agents/trace.js";
import { actionDigest, planDigest } from "./digest.js";
import { MEDIA_ROOT, resolveWithinRoot } from "./safepath.js";

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

export class ApprovalMismatchError extends Error {
  constructor(approvedDigest: string, currentDigest: string) {
    super(`Approved action digest ${approvedDigest} does not match current action digest ${currentDigest}`);
    this.name = "ApprovalMismatchError";
  }
}

function resolveMediaPaths(plan: EditPlan): EditPlan {
  return {
    ...plan,
    segments: plan.segments.map((segment) => ({
      ...segment,
      sourcePath: resolveWithinRoot(MEDIA_ROOT, segment.sourcePath),
    })),
  };
}

export async function renderPackage(
  plan: EditPlan,
  gate: ApprovalGate,
  options: RenderOptions = {},
): Promise<RenderPackageResult> {
  const proposedPlan = resolveMediaPaths(EditPlanSchema.parse(plan));
  const proposedPlanDigest = planDigest(proposedPlan);
  const id = proposedPlanDigest.slice(0, 12);
  const artifactsDir = resolve(options.artifactsDir ?? "artifacts");
  const outputDir = resolve(artifactsDir, id);
  const outputPath = resolve(outputDir, "packet.json");
  const unsignedAction: ProposedAction = {
    tool: "postforge-package-writer",
    argv: Object.freeze(["package", "--output", outputPath]),
    touches: Object.freeze([outputDir, outputPath]),
    description: "Write one local copy-ready packet; no publish, upload, or send",
    planDigest: proposedPlanDigest,
    digest: "",
  };
  const action: ProposedAction = Object.freeze({
    ...unsignedAction,
    digest: actionDigest(unsignedAction),
  });

  options.trace?.append("director", "approval_requested", {
    tool: action.tool,
    argv: action.argv,
    touches: action.touches,
    planDigest: action.planDigest,
    digest: action.digest,
  });
  const decision = await gate.request(action);
  options.trace?.append("human_gate", "approval_decided", {
    approved: decision.approved,
    reason: decision.reason,
    tool: action.tool,
    argv: action.argv,
    approvedDigest: decision.approvedDigest,
  });
  if (!decision.approved) return { rendered: false, reason: "denied", action };

  const currentPlan = resolveMediaPaths(EditPlanSchema.parse(plan));
  const currentPlanDigest = planDigest(currentPlan);
  const currentDigest = actionDigest({ ...action, planDigest: currentPlanDigest });
  const packet = buildPublishPacket(currentPlan);
  if (decision.approvedDigest !== currentDigest) {
    options.trace?.append("package_writer", "approval_mismatch", {
      approvedDigest: decision.approvedDigest,
      currentDigest,
    });
    throw new ApprovalMismatchError(decision.approvedDigest, currentDigest);
  }
  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(packet, null, 2)}\n`, { encoding: "utf8", flag: "w" });
  options.trace?.append("package_writer", "tool_completed", { path: outputPath });
  return { rendered: true, path: outputPath, packet, action };
}
