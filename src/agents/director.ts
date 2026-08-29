import {
  EditPlanSchema,
  PublishPacketSchema,
  QaReportSchema,
  validateEditPlan,
  type Brief,
  type EditPlan,
  type MediaProbe,
  type PublishPacket,
  type QaReport,
  type ResearchReport,
} from "../contracts.js";
import type { ApprovalDecision } from "../approval.js";
import type { ResearchTool } from "../tools/brightdata.js";
import { runMediaAnalyst, type MediaProbeFunction } from "./mediaAnalyst.js";
import { runResearcher } from "./researcher.js";
import { TraceLog, type TraceEvent } from "./trace.js";

export interface DirectorDependencies {
  readonly researchTool: ResearchTool;
  readonly probeMedia?: MediaProbeFunction;
  readonly approval?: ApprovalDecision;
}

interface DirectorEvidence {
  readonly plan: EditPlan;
  readonly research: ResearchReport;
  readonly probes: readonly MediaProbe[];
  readonly trace: readonly TraceEvent[];
}

export interface AwaitingApprovalResult extends DirectorEvidence {
  readonly status: "awaiting_approval";
}

export interface DeniedDirectorResult extends DirectorEvidence {
  readonly status: "denied";
  readonly reason: string;
}

export interface CompletedDirectorResult extends DirectorEvidence {
  readonly status: "complete";
  readonly qa: QaReport;
  readonly packet: PublishPacket;
}

export type DirectorResult = AwaitingApprovalResult | DeniedDirectorResult | CompletedDirectorResult;

async function tracedSubagent<T>(trace: TraceLog, actor: string, run: () => Promise<T>): Promise<T> {
  trace.append(actor, "subagent_started");
  try {
    return await run();
  } finally {
    trace.append(actor, "subagent_ended");
  }
}

function synthesizeEditPlan(research: ResearchReport, probes: readonly MediaProbe[]): EditPlan {
  if (research.findings.length === 0) throw new Error("Cannot direct an edit without source-linked research");
  if (probes.length === 0) throw new Error("Cannot direct an edit without media probes");

  const choiceCount = Math.min(3, probes.length, research.findings.length);
  const segments = probes.slice(0, choiceCount).map((probe, index) => {
    const finding = research.findings[index];
    if (!finding) throw new Error("Research finding disappeared during plan synthesis");
    return {
      sourcePath: probe.path,
      startSec: 0,
      endSec: Math.min(3, probe.durationSec),
      reason: finding.pattern,
    };
  });
  const citations = research.findings.slice(0, choiceCount).map((finding) => finding.url);
  return EditPlanSchema.parse({
    hook: research.findings[0]?.pattern ?? "Show the outcome first",
    segments,
    citations,
  });
}

export function buildQaReport(plan: EditPlan): QaReport {
  const checks = [
    {
      name: "positive segment duration",
      pass: plan.segments.every((segment) => segment.endSec > segment.startSec),
      detail: "Every source segment has a positive duration.",
    },
    {
      name: "source citations",
      pass: plan.citations.length >= plan.segments.length,
      detail: "Every edit choice has a source URL in the parallel citations list.",
    },
    {
      name: "external action boundary",
      pass: true,
      detail: "This workflow creates a local packet only and has no publish or send capability.",
    },
  ];
  return QaReportSchema.parse({ checks, allPassed: checks.every((check) => check.pass) });
}

export function buildPublishPacket(plan: EditPlan, brief?: Brief): PublishPacket {
  const qa = buildQaReport(plan);
  const platformTag = brief?.platform ?? "shortform";
  return PublishPacketSchema.parse({
    caption: brief ? `${plan.hook} ${brief.desiredReaction}` : plan.hook,
    hashtags: ["#PostForge", `#${platformTag}`],
    editPlan: plan,
    qa,
    external_action: false,
    readyToPublish: qa.allPassed,
  });
}

export async function runDirector(brief: Brief, deps: DirectorDependencies): Promise<DirectorResult> {
  const trace = new TraceLog();
  trace.append("director", "workflow_started", { platform: brief.platform });

  const [research, probes] = await Promise.all([
    tracedSubagent(trace, "researcher", async () =>
      await runResearcher(deps.researchTool, brief, (phase, detail) => {
        trace.append("researcher", phase === "start" ? "tool_started" : "tool_ended", detail);
      }),
    ),
    tracedSubagent(trace, "media_analyst", async () =>
      await runMediaAnalyst(brief, deps.probeMedia, (phase, path) => {
        trace.append("media_analyst", phase === "start" ? "tool_started" : "tool_ended", {
          tool: "ffprobe",
          argv: [path],
        });
      }),
    ),
  ]);

  const plan = synthesizeEditPlan(research, probes);
  const findingUrls = new Set(research.findings.map((finding) => finding.url));
  if (!plan.citations.every((citation) => findingUrls.has(citation))) {
    throw new Error("Edit plan contains a citation absent from the research report");
  }
  validateEditPlan(plan, probes);
  trace.append("director", "plan_validated", {
    segments: plan.segments.length,
    citations: plan.citations.length,
  });

  if (!deps.approval) {
    trace.append("director", "approval_requested", { action: "accept edit plan" });
    return { status: "awaiting_approval", plan, research, probes, trace: trace.snapshot() };
  }

  trace.append("director", "approval_decided", {
    approved: deps.approval.approved,
    reason: deps.approval.reason,
  });
  if (!deps.approval.approved) {
    return {
      status: "denied",
      reason: deps.approval.reason,
      plan,
      research,
      probes,
      trace: trace.snapshot(),
    };
  }

  const packet = buildPublishPacket(plan, brief);
  trace.append("director", "qa_completed", { allPassed: packet.qa.allPassed });
  trace.append("director", "packet_emitted", {
    external_action: packet.external_action,
    readyToPublish: packet.readyToPublish,
  });
  return {
    status: "complete",
    plan,
    research,
    probes,
    qa: packet.qa,
    packet,
    trace: trace.snapshot(),
  };
}
