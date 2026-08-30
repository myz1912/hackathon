import assert from "node:assert/strict";
import { mkdtemp, readFile, readlink, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  HYPERFRAMES_EXECUTABLE,
  OUTPUT_ROOT,
  buildCompositionHtml,
  buildHyperframesInvocation,
  computeEditPlanDigest,
  createBridgeServer,
  getBridgeTools,
  inspectEventMedia,
  loadConnectorManifest,
  renderEventGtm,
  syncRenderBridgeConnector,
  validateConnectorManifest,
  validateRenderRequest,
} from "../scripts/trueforge-render-bridge.mjs";

function validPlan() {
  return {
    run_id: "event-gtm-001",
    outcome: "grow_next_event_reach",
    direction: "event-energy",
    event_digest: "1".repeat(64),
    viral_digest: "2".repeat(64),
    media_manifest_digest: "3".repeat(64),
    moments: [
      { source: "IMG_4192.mov", start_seconds: 1.25, duration_seconds: 8 },
      { source: "IMG_4196.mov", start_seconds: 30, duration_seconds: 8 },
      { source: "IMG_4200.mov", start_seconds: 120, duration_seconds: 8 },
    ],
  };
}

function validRequest() {
  const plan = validPlan();
  return {
    plan,
    approval_binding: {
      run_id: plan.run_id,
      event_digest: plan.event_digest,
      viral_digest: plan.viral_digest,
      media_manifest_digest: plan.media_manifest_digest,
      edit_plan_digest: computeEditPlanDigest(plan),
    },
  };
}

test("accepts only an approval-bound fixed Event GTM render plan", () => {
  const request = validRequest();

  assert.deepEqual(validateRenderRequest(request), request);

  const stale = structuredClone(request);
  stale.plan.moments[0].start_seconds = 2;
  assert.throws(() => validateRenderRequest(stale), /edit_plan_digest mismatch/);

  const arbitrarySource = validRequest();
  arbitrarySource.plan.moments[0].source = "/tmp/other.mov";
  assert.throws(() => validateRenderRequest(arbitrarySource), /source is not allowlisted/);

  const extraField = validRequest();
  extraField.shell = "rm -rf /";
  assert.throws(() => validateRenderRequest(extraField), /unsupported field shell/);
});

test("builds one pinned shell-free HyperFrames invocation inside the ignored output root", () => {
  const invocation = buildHyperframesInvocation("event-gtm-001");

  assert.equal(HYPERFRAMES_EXECUTABLE, "/opt/homebrew/bin/npx");
  assert.equal(OUTPUT_ROOT, "/Users/yz/hackathon/artifacts/daoharness-event-gtm");
  assert.deepEqual(invocation, {
    executable: "/opt/homebrew/bin/npx",
    args: [
      "--yes",
      "hyperframes@0.8.19",
      "render",
      "/Users/yz/hackathon/artifacts/daoharness-event-gtm/event-gtm-001/project",
      "--quality",
      "high",
      "--fps",
      "30",
      "--sdr",
      "--strict",
      "--output",
      "/Users/yz/hackathon/artifacts/daoharness-event-gtm/event-gtm-001/daoharness-event-gtm.mp4",
    ],
    cwd: "/Users/yz/hackathon/artifacts/daoharness-event-gtm/event-gtm-001/project",
    outputPath:
      "/Users/yz/hackathon/artifacts/daoharness-event-gtm/event-gtm-001/daoharness-event-gtm.mp4",
  });
  assert.throws(() => buildHyperframesInvocation("../escape"), /run_id is invalid/);
});

test("builds a digestable read-only manifest for exactly the six fixed MOV inputs", async () => {
  const seen = [];
  const manifest = await inspectEventMedia({
    statFile: async (sourcePath) => {
      seen.push(sourcePath);
      return { isFile: () => true, size: 1234 };
    },
    hashFile: async (sourcePath) =>
      computeEditPlanDigest({ source: sourcePath }),
  });

  assert.equal(manifest.files.length, 6);
  assert.deepEqual(
    manifest.files.map(({ name }) => name),
    [
      "IMG_4190.mov",
      "IMG_4192.mov",
      "IMG_4196.mov",
      "IMG_4198.mov",
      "IMG_4199.mov",
      "IMG_4200.mov",
    ],
  );
  assert.equal(new Set(seen).size, 6);
  assert(
    manifest.files.every(
      ({ candidate_moments }) =>
        Array.isArray(candidate_moments) &&
        candidate_moments.length > 0 &&
        candidate_moments.every(
          ({ start_seconds, duration_seconds, evidence_label }) =>
            start_seconds >= 0 &&
            duration_seconds === 8 &&
            typeof evidence_label === "string" &&
            evidence_label.length > 0,
        ),
    ),
  );
  assert.match(manifest.media_manifest_digest, /^[0-9a-f]{64}$/);
  assert(!JSON.stringify(manifest).includes("trueforge"));
});

test("generates a deterministic DaoHarness-only 30-second composition from three moments", () => {
  const html = buildCompositionHtml(validPlan());

  assert.match(html, /data-composition-id="daoharness-event-gtm"/);
  assert.match(html, /data-duration="30"/);
  assert.match(html, /data-no-timeline/);
  assert.match(html, /@font-face\s*\{/);
  assert.match(html, /src:\s*local\("SF Mono"\)/);
  assert.match(html, /DAOHARNESS \/ EVENT GTM/);
  assert.match(html, /GROW THE NEXT EVENT'S REACH\./);
  assert.match(html, /EVENT GTM/);
  assert.match(html, /A DAOHARNESS CAPABILITY/);
  assert.match(html, /BUILT AROUND A REAL BUSINESS NEED/);
  assert.equal((html.match(/<video /g) ?? []).length, 3);
  assert.equal((html.match(/<audio /g) ?? []).length, 3);
  assert.match(html, /src="assets\/originals\/IMG_4192\.mov"/);
  assert.match(html, /data-media-start="1\.25"/);
  assert(!/TrueForge|PostForge/i.test(html));
  assert(!html.includes("<br"));
  assert(!html.includes("http://"));
  assert(!html.includes("https://"));
});

test("renders only after the inspected media digest matches and writes only under the output root", async () => {
  const outputRoot = await mkdtemp(path.join(os.tmpdir(), "daoharness-render-bridge-"));
  const request = validRequest();
  const mediaManifest = {
    files: [],
    media_manifest_digest: "a".repeat(64),
  };
  request.plan.media_manifest_digest = mediaManifest.media_manifest_digest;
  request.approval_binding.media_manifest_digest = mediaManifest.media_manifest_digest;
  request.approval_binding.edit_plan_digest = computeEditPlanDigest(request.plan);
  const invocations = [];

  try {
    const result = await renderEventGtm(request, {
      outputRoot,
      inspectMedia: async () => mediaManifest,
      execute: async (invocation) => {
        invocations.push(invocation);
        await writeFile(invocation.outputPath, "fake mp4");
      },
      probeOutput: async () => ({ duration_seconds: 30 }),
    });

    assert.equal(invocations.length, 1);
    assert.equal(invocations[0].executable, HYPERFRAMES_EXECUTABLE);
    assert(invocations[0].outputPath.startsWith(`${outputRoot}${path.sep}`));
    assert.equal(result.status, "rendered");
    assert.equal(result.mime_type, "video/mp4");
    assert.equal(result.video_url, "http://127.0.0.1:8791/artifacts/event-gtm-001/daoharness-event-gtm.mp4");
    assert.equal(
      await readlink(
        path.join(outputRoot, "event-gtm-001", "project", "assets", "originals", "IMG_4192.mov"),
      ),
      "/Users/yz/hackathon/IMG_4192.mov",
    );
    const html = await readFile(
      path.join(outputRoot, "event-gtm-001", "project", "index.html"),
      "utf8",
    );
    assert(!/TrueForge|PostForge/i.test(html));
  } finally {
    await rm(outputRoot, { recursive: true, force: true });
  }
});

test("fails before writing when the approval-bound media digest is stale", async () => {
  const request = validRequest();
  await assert.rejects(
    () =>
      renderEventGtm(request, {
        inspectMedia: async () => ({
          files: [],
          media_manifest_digest: "f".repeat(64),
        }),
        execute: async () => assert.fail("renderer must not execute"),
      }),
    /media_manifest_digest mismatch/,
  );
});

test("exposes exactly one read-only intake tool and one approval-gated fixed render tool", () => {
  const tools = getBridgeTools();

  assert.deepEqual(
    tools.map(({ name }) => name),
    ["inspect_event_media", "render_event_gtm"],
  );
  assert.deepEqual(tools[0].annotations, {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  });
  assert.deepEqual(tools[0].inputSchema, {
    type: "object",
    properties: {},
    additionalProperties: false,
  });
  assert.equal(tools[1].annotations.readOnlyHint, false);
  assert.equal(tools[1].annotations.destructiveHint, false);
  assert.equal(tools[1].inputSchema.additionalProperties, false);
  assert.deepEqual(tools[1].inputSchema.required, ["plan", "approval_binding"]);
  assert.equal(tools[1].inputSchema.properties.plan.additionalProperties, false);
  assert.equal(
    tools[1].inputSchema.properties.plan.properties.moments.maxItems,
    3,
  );
  assert.equal(
    tools[1].inputSchema.properties.plan.properties.moments.items.additionalProperties,
    false,
  );
  assert(!JSON.stringify(tools).includes("shell"));
  assert(!JSON.stringify(tools).includes("command"));
});

test("serves the bridge through stateless Streamable HTTP MCP and local video resources", async () => {
  const outputRoot = await mkdtemp(path.join(os.tmpdir(), "daoharness-mcp-"));
  const runRoot = path.join(outputRoot, "event-gtm-001");
  await import("node:fs/promises").then(({ mkdir }) => mkdir(runRoot, { recursive: true }));
  await writeFile(path.join(runRoot, "daoharness-event-gtm.mp4"), "fake mp4");
  const inspected = { files: [], media_manifest_digest: "a".repeat(64) };
  const rendered = {
    status: "rendered",
    run_id: "event-gtm-001",
    mime_type: "video/mp4",
    bytes: 8,
    duration_seconds: 30,
    media_manifest_digest: "a".repeat(64),
    edit_plan_digest: "b".repeat(64),
    video_url:
      "http://127.0.0.1:8791/artifacts/event-gtm-001/daoharness-event-gtm.mp4",
    download_url:
      "http://127.0.0.1:8791/artifacts/event-gtm-001/daoharness-event-gtm.mp4",
  };
  const server = createBridgeServer({
    outputRoot,
    inspectMedia: async () => inspected,
    render: async () => rendered,
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  try {
    const address = server.address();
    assert(address && typeof address === "object");
    const origin = `http://127.0.0.1:${address.port}`;
    const rpc = async (body) => {
      const response = await fetch(`${origin}/mcp`, {
        method: "POST",
        headers: {
          accept: "application/json, text/event-stream",
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      });
      return { response, body: response.status === 202 ? null : await response.json() };
    };

    const initialized = await rpc({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "test", version: "1" },
      },
    });
    assert.equal(initialized.response.status, 200);
    assert.equal(initialized.body.result.protocolVersion, "2025-03-26");

    const notification = await rpc({
      jsonrpc: "2.0",
      method: "notifications/initialized",
    });
    assert.equal(notification.response.status, 202);

    const listed = await rpc({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
    assert.deepEqual(
      listed.body.result.tools.map(({ name }) => name),
      ["inspect_event_media", "render_event_gtm"],
    );

    const inspectedResponse = await rpc({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "inspect_event_media", arguments: {} },
    });
    assert.deepEqual(inspectedResponse.body.result.structuredContent, inspected);

    const renderedResponse = await rpc({
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: { name: "render_event_gtm", arguments: validRequest() },
    });
    assert.deepEqual(renderedResponse.body.result.structuredContent, rendered);
    assert.equal(renderedResponse.body.result.content[1].type, "resource_link");

    const video = await fetch(
      `${origin}/artifacts/event-gtm-001/daoharness-event-gtm.mp4`,
    );
    assert.equal(video.status, 200);
    assert.equal(video.headers.get("content-type"), "video/mp4");
    assert.equal(await video.text(), "fake mp4");
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await rm(outputRoot, { recursive: true, force: true });
  }
});

test("registers and reads back the exact localhost remote MCP connector without secrets", async () => {
  const manifest = await loadConnectorManifest();
  assert.deepEqual(validateConnectorManifest(manifest), manifest);
  assert.deepEqual(manifest, {
    type: "remote",
    name: "daoharness-render-bridge",
    url: "http://127.0.0.1:8791/mcp",
    description:
      "Approval-gated local DaoHarness Event GTM rendering from six fixed user-owned MOV inputs.",
  });

  const requests = [];
  const fetchImpl = async (url, init = {}) => {
    requests.push({ url, init });
    if (url.endsWith("/api/v1/settings/mcp-servers")) {
      return Response.json({
        data: { name: manifest.name, manifest, auth_status: { status: "not_required" } },
      });
    }
    if (url.endsWith("/api/v1/mcp-servers/daoharness-render-bridge/tools")) {
      return Response.json({
        data: getBridgeTools().map((tool) => ({ ...tool, preload: true })),
      });
    }
    return new Response("not found", { status: 404 });
  };

  const result = await syncRenderBridgeConnector(manifest, {
    fetchImpl,
    baseUrl: "http://127.0.0.1:8790",
  });
  assert.deepEqual(result, {
    name: "daoharness-render-bridge",
    toolNames: ["inspect_event_media", "render_event_gtm"],
  });
  assert.equal(requests[0].init.method, "PUT");
  assert.deepEqual(JSON.parse(requests[0].init.body), { manifest });
  assert(!requests[0].init.body.includes("secret"));
});

test("production agent uses native choice and approval surfaces before the restricted render tool", async () => {
  const document = JSON.parse(
    await readFile(new URL("../trueforge/post-director.agent.json", import.meta.url), "utf8"),
  );
  const renderConnector = document.manifest.mcp_servers.find(
    ({ name }) => name === "daoharness-render-bridge",
  );
  assert.deepEqual(renderConnector, {
    name: "daoharness-render-bridge",
    enable_tools: ["inspect_event_media", "render_event_gtm"],
    disable_tools: [],
    preload_tools: ["inspect_event_media", "render_event_gtm"],
    require_approval_for_tools: ["render_event_gtm"],
    preload: false,
  });
  const instructions = document.manifest.instructions;
  assert.match(instructions, /Make this event reach more people/);
  assert.match(instructions, /ask_user_question exactly once/);
  assert.match(instructions, /Grow the next event's reach \(Recommended\)/);
  assert.match(instructions, /Prove sponsor value/);
  assert.match(instructions, /Build a repeatable Event GTM asset/);
  assert.match(instructions, /inspect_event_media/);
  assert.match(instructions, /render_event_gtm/);
  assert.match(instructions, /native tool approval/);
  assert.match(instructions, /TrueForge[^.]*must never appear[^.]*generated video/i);
  assert.doesNotMatch(instructions, /No render tool is attached/i);
});
