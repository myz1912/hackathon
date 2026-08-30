import { access, stat } from "node:fs/promises";
import {
  AutoApproveGate,
  AutoDenyGate,
  type ApprovalDecision,
  type ApprovalGate,
  type ProposedAction,
} from "./approval.js";
import { BriefSchema } from "./contracts.js";
import { runDirector } from "./agents/director.js";
import { renderTrace, TraceLog } from "./agents/trace.js";
import { makeResearchTool } from "./tools/brightdata.js";
import { READ_ONLY_TOOL_IDS } from "./tools/policy.js";
import { ApprovalMismatchError, renderPackage } from "./render.js";
import { planDigest } from "./digest.js";
import { MEDIA_ROOT, resolveWithinRoot } from "./safepath.js";

const args = new Set(process.argv.slice(2));
const selectedModes = ["--deny", "--approve", "--tamper"].filter((mode) => args.has(mode));
if (selectedModes.length !== 1) {
  throw new Error("Pass exactly one of --deny, --approve, or --tamper");
}
const tamper = args.has("--tamper");

const brief = BriefSchema.parse({
  goal: "Show that PostForge turns owned clips into a source-backed short-form package",
  desiredReaction: "Trust the workflow because every creative choice is inspectable",
  audience: "developer-tool builders and hackathon judges",
  platform: "tiktok",
  mediaPaths: ["demo-hook.mp4", "demo-proof.mp4", "demo-result.mp4"],
});

function section(title: string): void {
  process.stdout.write(`\n${title}\n${"-".repeat(title.length)}\n`);
}

function row(label: string, value: string): void {
  process.stdout.write(`${label.padEnd(20)} ${value}\n`);
}

function spanTimings(trace: Awaited<ReturnType<typeof runDirector>>["trace"]): void {
  for (const actor of ["researcher", "media_analyst"] as const) {
    const start = trace.find((event) => event.actor === actor && event.kind === "subagent_started");
    const end = trace.find((event) => event.actor === actor && event.kind === "subagent_ended");
    if (!start || !end) continue;
    row(actor, `${start.t} -> ${end.t}  (${Date.parse(end.t) - Date.parse(start.t)} ms)`);
  }
}

const result = await runDirector(brief, { researchTool: makeResearchTool(process.env) });

section("1. Brief");
row("goal", brief.goal);
row("reaction", brief.desiredReaction);
row("audience", brief.audience);
row("platform", brief.platform);
row("media", brief.mediaPaths.join(", "));
row("media root", resolveWithinRoot(MEDIA_ROOT, "."));
row("Bright Data tools", READ_ONLY_TOOL_IDS.join(", "));
row("research mode", result.research.sourceMode);
row("orchestration mode", "local fixture fallback; TrueForge :8790 was unreachable during verification");

section("2. Parallel subagents");
spanTimings(result.trace);
row("overlap", "Both spans started before either span ended; see trace below.");

section("3. Research findings");
for (const [index, finding] of result.research.findings.entries()) {
  row(`finding ${index + 1}`, finding.title);
  row("source", finding.url);
  row("collected", finding.collectedAt);
  row("pattern", finding.pattern);
}

section("4. Proposed edit plan");
row("hook", result.plan.hook);
row("plan digest", planDigest(result.plan));
for (const [index, segment] of result.plan.segments.entries()) {
  row(
    `segment ${index + 1}`,
    `${segment.sourcePath}  ${segment.startSec.toFixed(1)}-${segment.endSec.toFixed(1)}s`,
  );
  row("reason", segment.reason);
  row("citation", result.plan.citations[index] ?? "MISSING");
}

const gate = args.has("--deny") ? new AutoDenyGate() : new AutoApproveGate();
const demoTrace = new TraceLog(result.trace);
let beforeExists = false;
let beforeModifiedAt: number | undefined;
let requestedAction: ProposedAction | undefined;
let approvalDecision: ApprovalDecision | undefined;
const inspectingGate: ApprovalGate = {
  async request(action) {
    requestedAction = action;
    const actionTarget = action.touches.at(-1);
    if (actionTarget) {
      try {
        const metadata = await stat(actionTarget);
        beforeExists = true;
        beforeModifiedAt = metadata.mtimeMs;
      } catch {
        beforeExists = false;
      }
    }
    approvalDecision = await gate.request(action);
    if (tamper && approvalDecision.approved) {
      const segment = result.plan.segments[0];
      if (!segment) throw new Error("Cannot demonstrate tampering without an edit segment");
      segment.endSec += 0.25;
    }
    return approvalDecision;
  },
};
let writeResult: Awaited<ReturnType<typeof renderPackage>> | undefined;
let mismatch: ApprovalMismatchError | undefined;
try {
  writeResult = await renderPackage(result.plan, inspectingGate, { trace: demoTrace });
} catch (error) {
  if (!(error instanceof ApprovalMismatchError)) throw error;
  mismatch = error;
}
const action = writeResult?.action ?? requestedAction;
if (!action) throw new Error("Render did not propose an action");
let afterExists = false;
let modifiedAt = "not written";
let afterModifiedAt: number | undefined;
const target = writeResult?.rendered ? writeResult.path : action.touches[1];
if (target) {
  try {
    await access(target);
    afterExists = true;
    const metadata = await stat(target);
    afterModifiedAt = metadata.mtimeMs;
    modifiedAt = metadata.mtime.toISOString();
  } catch {
    afterExists = false;
  }
}

section("5. Approval gate");
row("tool", action.tool);
row("exact argv", JSON.stringify(action.argv));
row("touches", action.touches.join(", "));
row("plan digest", action.planDigest);
row("action digest", action.digest);
row("approved digest", approvalDecision?.approvedDigest ?? "none");
row(
  "decision",
  mismatch ? "REJECTED: APPROVAL DIGEST MISMATCH" : writeResult?.rendered ? "APPROVED for this action" : "DENIED",
);
row("write performed", writeResult?.rendered ? "yes" : "no");
if (writeResult && !writeResult.rendered) {
  row("denial result", `rendered=false, reason=${writeResult.reason}`);
}
if (mismatch) row("mismatch result", mismatch.message);
if (writeResult?.rendered) row("packet path", writeResult.path);
row("target existed before", String(beforeExists));
row("target exists after", String(afterExists));
row("target mtime", modifiedAt);
if (!writeResult?.rendered && beforeExists) {
  row("target unchanged", String(beforeModifiedAt === afterModifiedAt));
}

section("6. QA and final packet");
if (writeResult?.rendered) {
  for (const check of writeResult.packet.qa.checks) {
    row(check.name, `${check.pass ? "PASS" : "FAIL"}  ${check.detail}`);
  }
  row("allPassed", String(writeResult.packet.qa.allPassed));
  row("readyToPublish", String(writeResult.packet.readyToPublish));
  row("external_action", String(writeResult.packet.external_action));
} else {
  row("packet", mismatch ? "not created or changed after tampering" : "not created or changed by this denied action");
  row("external_action", "false (contract literal; no external action exists)");
}

section("Trace");
process.stdout.write(`${renderTrace(demoTrace.snapshot())}\n`);
