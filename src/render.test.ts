import { mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AutoApproveGate, AutoDenyGate, type ProposedAction } from "./approval.js";
import type { EditPlan } from "./contracts.js";
import { renderPackage } from "./render.js";

const plan: EditPlan = {
  hook: "Show the outcome first",
  segments: [
    {
      sourcePath: "owned.mp4",
      startSec: 0,
      endSec: 2,
      reason: "Visible proof supports the opening claim",
    },
  ],
  citations: ["https://example.com/source"],
};

const action: ProposedAction = {
  tool: "test-tool",
  argv: ["write", "one"],
  touches: ["one"],
  description: "test one action",
};

describe("renderPackage", () => {
  it("does not create an artifact when the write is denied", async () => {
    const root = await mkdtemp(join(tmpdir(), "postforge-deny-"));
    const artifactsDir = join(root, "artifacts");
    const result = await renderPackage(plan, new AutoDenyGate(), { artifactsDir });

    expect(result).toMatchObject({ rendered: false, reason: "denied" });
    await expect(stat(artifactsDir)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("writes a packet only after approval and hard-codes the external action boundary", async () => {
    const root = await mkdtemp(join(tmpdir(), "postforge-approve-"));
    const result = await renderPackage(plan, new AutoApproveGate(), { artifactsDir: join(root, "artifacts") });

    expect(result.rendered).toBe(true);
    if (!result.rendered) throw new Error("Expected approved render");
    const payload: unknown = JSON.parse(await readFile(result.path, "utf8"));
    expect(payload).toMatchObject({ external_action: false, readyToPublish: true });
  });
});

describe("action-scoped approval", () => {
  it("does not authorize a second action after approving the first", async () => {
    const gate = new AutoApproveGate();
    await expect(gate.request(action)).resolves.toMatchObject({ approved: true });
    await expect(
      gate.request({ ...action, argv: ["write", "two"], touches: ["two"], description: "test action two" }),
    ).resolves.toMatchObject({ approved: false });
  });
});
