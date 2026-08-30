#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { createReadStream } from "node:fs";
import { mkdir, readFile, stat, symlink, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

export const HYPERFRAMES_EXECUTABLE = "/opt/homebrew/bin/npx";
export const HYPERFRAMES_PACKAGE = "hyperframes@0.8.19";
export const OUTPUT_ROOT = "/Users/yz/hackathon/artifacts/daoharness-event-gtm";
export const BRIDGE_ORIGIN = "http://127.0.0.1:8791";
export const TRUEFORGE_BASE_URL = "http://127.0.0.1:8790";
const FFPROBE_EXECUTABLE = "/opt/homebrew/bin/ffprobe";
const execFileAsync = promisify(execFile);
const CONNECTOR_MANIFEST_URL = new URL("../trueforge/render-bridge.mcp.json", import.meta.url);

export const SOURCE_MEDIA = Object.freeze({
  "IMG_4190.mov": Object.freeze({
    path: "/Users/yz/hackathon/IMG_4190.mov",
    duration_seconds: 10.832,
    candidate_moments: Object.freeze([
      Object.freeze({ start_seconds: 0, duration_seconds: 8, evidence_label: "opening product context" }),
    ]),
  }),
  "IMG_4192.mov": Object.freeze({
    path: "/Users/yz/hackathon/IMG_4192.mov",
    duration_seconds: 16.903,
    candidate_moments: Object.freeze([
      Object.freeze({ start_seconds: 1.25, duration_seconds: 8, evidence_label: "attendee conversation" }),
    ]),
  }),
  "IMG_4196.mov": Object.freeze({
    path: "/Users/yz/hackathon/IMG_4196.mov",
    duration_seconds: 49.578,
    candidate_moments: Object.freeze([
      Object.freeze({ start_seconds: 41, duration_seconds: 8, evidence_label: "attendee delight and close" }),
    ]),
  }),
  "IMG_4198.mov": Object.freeze({
    path: "/Users/yz/hackathon/IMG_4198.mov",
    duration_seconds: 11.77,
    candidate_moments: Object.freeze([
      Object.freeze({ start_seconds: 3.5, duration_seconds: 8, evidence_label: "guest wave and venue energy" }),
    ]),
  }),
  "IMG_4199.mov": Object.freeze({
    path: "/Users/yz/hackathon/IMG_4199.mov",
    duration_seconds: 87.387,
    candidate_moments: Object.freeze([
      Object.freeze({ start_seconds: 60.75, duration_seconds: 8, evidence_label: "group laughter and participation" }),
    ]),
  }),
  "IMG_4200.mov": Object.freeze({
    path: "/Users/yz/hackathon/IMG_4200.mov",
    duration_seconds: 266.162,
    candidate_moments: Object.freeze([
      Object.freeze({ start_seconds: 206, duration_seconds: 8, evidence_label: "facilitator speaking" }),
    ]),
  }),
});

export const OUTCOMES = Object.freeze([
  "grow_next_event_reach",
  "prove_sponsor_value",
  "build_repeatable_event_gtm",
]);

export const DIRECTIONS = Object.freeze([
  "event-energy",
  "dark-premium",
  "credibility-proof",
  "sarcastic_reaction",
]);

const OUTCOME_COPY = Object.freeze({
  grow_next_event_reach: "GROW THE NEXT EVENT'S REACH.",
  prove_sponsor_value: "PROVE VALUE TO THE PEOPLE WHO BACK IT.",
  build_repeatable_event_gtm: "TURN ONE EVENT INTO A REUSABLE GTM ASSET.",
});

const REQUEST_FIELDS = Object.freeze(["plan", "approval_binding"]);
const PLAN_FIELDS = Object.freeze([
  "run_id",
  "outcome",
  "direction",
  "event_digest",
  "viral_digest",
  "media_manifest_digest",
  "moments",
]);
const APPROVAL_BINDING_FIELDS = Object.freeze([
  "run_id",
  "event_digest",
  "viral_digest",
  "media_manifest_digest",
  "edit_plan_digest",
]);
const MOMENT_FIELDS = Object.freeze(["source", "start_seconds", "duration_seconds"]);
const DIGEST_PATTERN = /^[0-9a-f]{64}$/;
const DIGEST_SCHEMA = Object.freeze({ type: "string", pattern: "^[0-9a-f]{64}$" });

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function assertRunId(value) {
  invariant(
    typeof value === "string" && /^[a-z0-9][a-z0-9-]{2,63}$/.test(value),
    "run_id is invalid",
  );
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertExactFields(value, fields, label) {
  invariant(isRecord(value), `${label} must be an object`);
  const unsupported = Object.keys(value).filter((field) => !fields.includes(field));
  invariant(unsupported.length === 0, `unsupported field ${unsupported[0]}`);
  const missing = fields.filter((field) => !Object.hasOwn(value, field));
  invariant(missing.length === 0, `${label} is missing ${missing[0]}`);
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
}

export function computeEditPlanDigest(plan) {
  return createHash("sha256").update(JSON.stringify(canonicalize(plan))).digest("hex");
}

async function sha256File(sourcePath) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(sourcePath)) hash.update(chunk);
  return hash.digest("hex");
}

export async function inspectEventMedia({ statFile = stat, hashFile = sha256File } = {}) {
  const files = [];
  for (const [name, source] of Object.entries(SOURCE_MEDIA)) {
    const metadata = await statFile(source.path);
    invariant(metadata?.isFile?.() === true, `${name} is not a regular file`);
    invariant(Number.isInteger(metadata.size) && metadata.size > 0, `${name} is empty`);
    const sha256 = await hashFile(source.path);
    assertDigest(sha256, `${name} sha256`);
    files.push({
      name,
      bytes: metadata.size,
      duration_seconds: source.duration_seconds,
      sha256,
      candidate_moments: structuredClone(source.candidate_moments),
    });
  }
  return {
    files,
    media_manifest_digest: computeEditPlanDigest(files),
  };
}

function assertDigest(value, label) {
  invariant(typeof value === "string" && DIGEST_PATTERN.test(value), `${label} must be sha256`);
}

function validatePlan(plan) {
  assertExactFields(plan, PLAN_FIELDS, "plan");
  assertRunId(plan.run_id);
  invariant(OUTCOMES.includes(plan.outcome), "outcome is not supported");
  invariant(DIRECTIONS.includes(plan.direction), "direction is not supported");
  assertDigest(plan.event_digest, "event_digest");
  assertDigest(plan.viral_digest, "viral_digest");
  assertDigest(plan.media_manifest_digest, "media_manifest_digest");
  invariant(Array.isArray(plan.moments) && plan.moments.length === 3, "moments must contain exactly 3 entries");

  const sources = [];
  for (const [index, moment] of plan.moments.entries()) {
    assertExactFields(moment, MOMENT_FIELDS, `moment ${index + 1}`);
    const source = SOURCE_MEDIA[moment.source];
    invariant(source, `moment ${index + 1} source is not allowlisted`);
    invariant(
      typeof moment.start_seconds === "number" &&
        Number.isFinite(moment.start_seconds) &&
        moment.start_seconds >= 0,
      `moment ${index + 1} start_seconds is invalid`,
    );
    invariant(moment.duration_seconds === 8, `moment ${index + 1} duration_seconds must equal 8`);
    invariant(
      moment.start_seconds + moment.duration_seconds <= source.duration_seconds,
      `moment ${index + 1} exceeds source duration`,
    );
    sources.push(moment.source);
  }
  invariant(new Set(sources).size === sources.length, "moments must use 3 distinct allowlisted sources");
}

export function validateRenderRequest(request) {
  assertExactFields(request, REQUEST_FIELDS, "render request");
  validatePlan(request.plan);
  assertExactFields(request.approval_binding, APPROVAL_BINDING_FIELDS, "approval_binding");
  const binding = request.approval_binding;
  for (const field of APPROVAL_BINDING_FIELDS.filter((field) => field !== "edit_plan_digest")) {
    invariant(binding[field] === request.plan[field], `${field} mismatch`);
  }
  assertDigest(binding.edit_plan_digest, "edit_plan_digest");
  invariant(
    binding.edit_plan_digest === computeEditPlanDigest(request.plan),
    "edit_plan_digest mismatch",
  );
  return structuredClone(request);
}

function buildHyperframesInvocationAtRoot(runId, outputRoot) {
  assertRunId(runId);
  const runRoot = path.join(outputRoot, runId);
  const projectDirectory = path.join(runRoot, "project");
  const outputPath = path.join(runRoot, "daoharness-event-gtm.mp4");
  return {
    executable: HYPERFRAMES_EXECUTABLE,
    args: [
      "--yes",
      HYPERFRAMES_PACKAGE,
      "render",
      projectDirectory,
      "--quality",
      "high",
      "--fps",
      "30",
      "--sdr",
      "--strict",
      "--output",
      outputPath,
    ],
    cwd: projectDirectory,
    outputPath,
  };
}

export function buildHyperframesInvocation(runId) {
  return buildHyperframesInvocationAtRoot(runId, OUTPUT_ROOT);
}

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : String(value).replace(/0+$/, "").replace(/\.$/, "");
}

export function buildCompositionHtml(plan) {
  validatePlan(plan);
  const videos = plan.moments
    .map((moment, index) => {
      const start = index * 8;
      const mediaStart = formatNumber(moment.start_seconds);
      const source = `assets/originals/${moment.source}`;
      return [
        `      <video id="moment-${index + 1}" class="clip moment" src="${source}" data-start="${start}" data-duration="8" data-media-start="${mediaStart}" data-track-index="1" muted playsinline></video>`,
        `      <audio id="moment-${index + 1}-audio" src="${source}" data-start="${start}" data-duration="8" data-media-start="${mediaStart}" data-track-index="10" data-volume="1"></audio>`,
      ].join("\n");
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <title>DaoHarness Event GTM</title>
    <style>
      @font-face { font-family: "SFMono-Regular"; src: local("SF Mono"); }
      :root { color-scheme: light; }
      * { box-sizing: border-box; }
      html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; }
      body { background: #F7F2E7; color: #14120F; font-family: "SFMono-Regular", "SF Mono", ui-monospace, monospace; }
      #root { position: relative; width: 1920px; height: 1080px; overflow: hidden; background: #F7F2E7; }
      .clip { position: absolute; inset: 0; width: 100%; height: 100%; }
      .moment { object-fit: cover; }
      .veil { position: absolute; inset: 0; background: rgba(20, 18, 15, 0.28); }
      .card { position: absolute; left: 72px; max-width: 1340px; padding: 34px 40px; background: #FFFFFF; border: 3px solid #14120F; border-radius: 12px; box-shadow: 6px 6px 0 #14120F; }
      .kicker { margin: 0 0 20px; font-size: 30px; font-weight: 700; letter-spacing: 0.08em; }
      h1, h2 { margin: 0; max-width: 1320px; line-height: 0.98; text-wrap: balance; }
      h1 { font-size: 112px; }
      h2 { font-size: 78px; }
      .intro .card { top: 72px; }
      .choice .card { bottom: 72px; border-color: #4B4BE8; box-shadow: 6px 6px 0 #4B4BE8; }
      .connection .card { bottom: 72px; }
      .end { background: #FFC91F; padding: 76px; display: grid; align-content: center; }
      .end .stamp { padding: 54px; background: #FFFFFF; border: 3px solid #14120F; border-radius: 12px; box-shadow: 6px 6px 0 #14120F; }
      .end p { margin: 18px 0 0; font-size: 44px; font-weight: 700; letter-spacing: 0.04em; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="daoharness-event-gtm" data-no-timeline data-start="0" data-width="1920" data-height="1080" data-duration="30">
${videos}
      <section id="business-need" class="clip intro" data-start="0" data-duration="4" data-track-index="2">
        <div class="veil"></div><div class="card"><p class="kicker">DAOHARNESS / EVENT GTM / REAL BUSINESS NEED</p><h1>MAKE THIS EVENT REACH MORE PEOPLE.</h1></div>
      </section>
      <section id="human-choice" class="clip choice" data-start="4" data-duration="4" data-track-index="2">
        <div class="veil"></div><div class="card"><p class="kicker">ONE HUMAN CHOICE</p><h2>${OUTCOME_COPY[plan.outcome]}</h2></div>
      </section>
      <section id="connected-moments" class="clip connection" data-start="8" data-duration="16" data-track-index="2">
        <div class="card"><p class="kicker">BEST MOMENTS, CONNECTED</p><h2>THE CONTENT WAS ALREADY IN THE ROOM.</h2></div>
      </section>
      <section id="capability-stamp" class="clip end" data-start="24" data-duration="6" data-track-index="2">
        <div class="stamp"><p class="kicker">EVENT GTM</p><h1>A DAOHARNESS CAPABILITY</h1><p>BUILT AROUND A REAL BUSINESS NEED</p></div>
      </section>
    </div>
  </body>
</html>
`;
}

function safeChildEnvironment() {
  return Object.fromEntries(
    ["HOME", "PATH", "TMPDIR", "LANG", "LC_ALL"]
      .filter((name) => typeof process.env[name] === "string")
      .map((name) => [name, process.env[name]]),
  );
}

async function executeHyperframes(invocation) {
  await execFileAsync(invocation.executable, invocation.args, {
    cwd: invocation.cwd,
    timeout: 15 * 60 * 1000,
    maxBuffer: 4 * 1024 * 1024,
    env: {
      ...safeChildEnvironment(),
      NO_COLOR: "1",
      npm_config_offline: "true",
    },
  });
}

async function probeRenderedVideo(outputPath) {
  const { stdout } = await execFileAsync(
    FFPROBE_EXECUTABLE,
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration:stream=codec_type",
      "-of",
      "json",
      outputPath,
    ],
    {
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
      env: safeChildEnvironment(),
    },
  );
  const payload = JSON.parse(stdout);
  const duration = Number(payload?.format?.duration);
  invariant(payload?.streams?.some((stream) => stream?.codec_type === "video"), "rendered output has no video stream");
  invariant(Number.isFinite(duration) && duration >= 29.5 && duration <= 30.5, "rendered output duration must be 30 seconds");
  return { duration_seconds: duration };
}

async function writeRenderProject(request, mediaManifest, outputRoot) {
  const runRoot = path.join(outputRoot, request.plan.run_id);
  const projectDirectory = path.join(runRoot, "project");
  const assetDirectory = path.join(projectDirectory, "assets", "originals");
  await mkdir(outputRoot, { recursive: true });
  await mkdir(runRoot);
  await mkdir(assetDirectory, { recursive: true });
  await writeFile(path.join(projectDirectory, "index.html"), buildCompositionHtml(request.plan), {
    encoding: "utf8",
    flag: "wx",
  });
  await writeFile(
    path.join(projectDirectory, "package.json"),
    `${JSON.stringify({ name: "daoharness-event-gtm", private: true, type: "module" }, null, 2)}\n`,
    { encoding: "utf8", flag: "wx" },
  );
  await writeFile(
    path.join(runRoot, "plan.json"),
    `${JSON.stringify({ request, media_manifest: mediaManifest }, null, 2)}\n`,
    { encoding: "utf8", flag: "wx" },
  );
  for (const [name, source] of Object.entries(SOURCE_MEDIA)) {
    await symlink(source.path, path.join(assetDirectory, name));
  }
}

export async function renderEventGtm(
  input,
  {
    outputRoot = OUTPUT_ROOT,
    inspectMedia = inspectEventMedia,
    execute = executeHyperframes,
    probeOutput = probeRenderedVideo,
  } = {},
) {
  const request = validateRenderRequest(input);
  const mediaManifest = await inspectMedia();
  invariant(
    mediaManifest?.media_manifest_digest === request.plan.media_manifest_digest,
    "media_manifest_digest mismatch",
  );
  await writeRenderProject(request, mediaManifest, outputRoot);
  const invocation = buildHyperframesInvocationAtRoot(request.plan.run_id, outputRoot);
  await execute(invocation);
  const outputMetadata = await stat(invocation.outputPath);
  invariant(outputMetadata.isFile() && outputMetadata.size > 0, "rendered output is missing or empty");
  const probe = await probeOutput(invocation.outputPath);
  const artifactUrl = `${BRIDGE_ORIGIN}/artifacts/${encodeURIComponent(request.plan.run_id)}/daoharness-event-gtm.mp4`;
  return {
    status: "rendered",
    run_id: request.plan.run_id,
    mime_type: "video/mp4",
    bytes: outputMetadata.size,
    duration_seconds: probe.duration_seconds,
    media_manifest_digest: mediaManifest.media_manifest_digest,
    edit_plan_digest: request.approval_binding.edit_plan_digest,
    video_url: artifactUrl,
    download_url: artifactUrl,
  };
}

export function getBridgeTools() {
  const momentSchema = {
    type: "object",
    properties: {
      source: { type: "string", enum: Object.keys(SOURCE_MEDIA) },
      start_seconds: { type: "number", minimum: 0, maximum: 258.162 },
      duration_seconds: { type: "number", const: 8 },
    },
    required: [...MOMENT_FIELDS],
    additionalProperties: false,
  };
  const planSchema = {
    type: "object",
    properties: {
      run_id: { type: "string", pattern: "^[a-z0-9][a-z0-9-]{2,63}$" },
      outcome: { type: "string", enum: [...OUTCOMES] },
      direction: { type: "string", enum: [...DIRECTIONS] },
      event_digest: DIGEST_SCHEMA,
      viral_digest: DIGEST_SCHEMA,
      media_manifest_digest: DIGEST_SCHEMA,
      moments: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: momentSchema,
      },
    },
    required: [...PLAN_FIELDS],
    additionalProperties: false,
  };
  const approvalBindingSchema = {
    type: "object",
    properties: Object.fromEntries(
      APPROVAL_BINDING_FIELDS.map((field) => [
        field,
        field === "run_id"
          ? { type: "string", pattern: "^[a-z0-9][a-z0-9-]{2,63}$" }
          : DIGEST_SCHEMA,
      ]),
    ),
    required: [...APPROVAL_BINDING_FIELDS],
    additionalProperties: false,
  };

  return [
    {
      name: "inspect_event_media",
      description:
        "Read the fixed six user-owned event MOVs and return names, sizes, durations, hashes, and the approval-binding media manifest digest. Accepts no paths or arguments.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    {
      name: "render_event_gtm",
      description:
        "Render one approval-bound 30-second DaoHarness Event GTM video from exactly three allowlisted eight-second moments. No arbitrary paths, executable, arguments, text, or external action are accepted.",
      inputSchema: {
        type: "object",
        properties: {
          plan: planSchema,
          approval_binding: approvalBindingSchema,
        },
        required: [...REQUEST_FIELDS],
        additionalProperties: false,
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
  ];
}

function writeJson(response, status, body) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(body === undefined ? undefined : JSON.stringify(body));
}

async function readJsonBody(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    invariant(Buffer.byteLength(body) <= 1024 * 1024, "request body exceeds 1 MiB");
  }
  return JSON.parse(body);
}

function rpcResult(id, result) {
  return { jsonrpc: "2.0", id, result };
}

function rpcError(id, code, message) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

function toolResult(result, { resourceLink = false } = {}) {
  const content = [{ type: "text", text: JSON.stringify(result) }];
  if (resourceLink) {
    content.push({
      type: "resource_link",
      name: "DaoHarness Event GTM video",
      uri: result.video_url,
      description: "Playable and downloadable local 30-second Event GTM video.",
      mimeType: "video/mp4",
    });
  }
  return { content, structuredContent: result, isError: false };
}

async function handleMcpMessage(message, { inspectMedia, render }) {
  invariant(isRecord(message) && message.jsonrpc === "2.0", "invalid JSON-RPC request");
  if (!Object.hasOwn(message, "id")) {
    invariant(message.method === "notifications/initialized", "unsupported notification");
    return null;
  }
  if (message.method === "initialize") {
    return rpcResult(message.id, {
      protocolVersion: "2025-03-26",
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "daoharness-render-bridge", version: "0.1.0" },
    });
  }
  if (message.method === "ping") return rpcResult(message.id, {});
  if (message.method === "tools/list") {
    return rpcResult(message.id, { tools: getBridgeTools() });
  }
  if (message.method === "tools/call") {
    const name = message.params?.name;
    const args = message.params?.arguments ?? {};
    try {
      if (name === "inspect_event_media") {
        assertExactFields(args, [], "inspect_event_media arguments");
        return rpcResult(message.id, toolResult(await inspectMedia()));
      }
      if (name === "render_event_gtm") {
        // TrueForge 0.1.4 enforces the human stop through the agent manifest's
        // require_approval_for_tools selector. This loopback MCP server validates
        // the approved call's digest binding but is not standalone approval auth.
        const request = validateRenderRequest(args);
        return rpcResult(message.id, toolResult(await render(request), { resourceLink: true }));
      }
      return rpcError(message.id, -32602, `unknown tool ${String(name)}`);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error);
      return rpcResult(message.id, {
        content: [{ type: "text", text: messageText }],
        isError: true,
      });
    }
  }
  return rpcError(message.id, -32601, `method not found: ${String(message.method)}`);
}

async function serveArtifact(request, response, outputRoot) {
  const match = request.url?.match(
    /^\/artifacts\/([a-z0-9][a-z0-9-]{2,63})\/daoharness-event-gtm\.mp4$/,
  );
  if (!match || (request.method !== "GET" && request.method !== "HEAD")) return false;
  const outputPath = path.join(outputRoot, match[1], "daoharness-event-gtm.mp4");
  try {
    const metadata = await stat(outputPath);
    invariant(metadata.isFile() && metadata.size > 0, "artifact is unavailable");
    response.writeHead(200, {
      "content-type": "video/mp4",
      "content-length": String(metadata.size),
      "content-disposition": 'inline; filename="daoharness-event-gtm.mp4"',
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    });
    if (request.method === "HEAD") response.end();
    else createReadStream(outputPath).pipe(response);
  } catch {
    writeJson(response, 404, { error: { message: "artifact not found" } });
  }
  return true;
}

export function createBridgeServer({
  outputRoot = OUTPUT_ROOT,
  inspectMedia = inspectEventMedia,
  render = renderEventGtm,
} = {}) {
  return createServer(async (request, response) => {
    try {
      if (await serveArtifact(request, response, outputRoot)) return;
      if (request.url !== "/mcp") {
        writeJson(response, 404, { error: { message: "not found" } });
        return;
      }
      if (request.method === "GET") {
        response.writeHead(405, { allow: "POST" });
        response.end();
        return;
      }
      if (request.method !== "POST") {
        response.writeHead(405, { allow: "POST" });
        response.end();
        return;
      }
      const message = await readJsonBody(request);
      const reply = await handleMcpMessage(message, { inspectMedia, render });
      if (reply === null) {
        response.writeHead(202, { "cache-control": "no-store" });
        response.end();
        return;
      }
      writeJson(response, 200, reply);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error);
      writeJson(response, 400, rpcError(null, -32600, messageText));
    }
  });
}

export async function loadConnectorManifest(source = CONNECTOR_MANIFEST_URL) {
  return JSON.parse(await readFile(source, "utf8"));
}

export function validateConnectorManifest(manifest) {
  assertExactFields(manifest, ["type", "name", "url", "description"], "connector manifest");
  invariant(manifest.type === "remote", "connector type must be remote");
  invariant(manifest.name === "daoharness-render-bridge", "connector name is invalid");
  invariant(manifest.url === `${BRIDGE_ORIGIN}/mcp`, "connector URL is invalid");
  invariant(
    manifest.description ===
      "Approval-gated local DaoHarness Event GTM rendering from six fixed user-owned MOV inputs.",
    "connector description is invalid",
  );
  return structuredClone(manifest);
}

function normalizeBaseUrl(value) {
  const parsed = new URL(value);
  invariant(
    (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      parsed.username === "" &&
      parsed.password === "" &&
      (parsed.pathname === "" || parsed.pathname === "/") &&
      parsed.search === "" &&
      parsed.hash === "",
    "TrueForge base URL must be an HTTP origin without credentials",
  );
  return parsed.origin;
}

async function requestJson(fetchImpl, url, init) {
  const response = await fetchImpl(url, init);
  invariant(response?.ok === true, `request failed with HTTP ${response?.status ?? "unknown"}`);
  return response.json();
}

export async function syncRenderBridgeConnector(
  source,
  { fetchImpl = globalThis.fetch, baseUrl = TRUEFORGE_BASE_URL } = {},
) {
  const manifest = validateConnectorManifest(source);
  const origin = normalizeBaseUrl(baseUrl);
  const saved = await requestJson(fetchImpl, `${origin}/api/v1/settings/mcp-servers`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ manifest }),
  });
  invariant(saved?.data?.name === manifest.name, "connector read-back name mismatch");
  invariant(
    JSON.stringify(canonicalize(saved.data.manifest)) === JSON.stringify(canonicalize(manifest)),
    "connector read-back manifest mismatch",
  );
  invariant(saved.data.auth_status?.status === "not_required", "connector unexpectedly requires authentication");
  const listed = await requestJson(
    fetchImpl,
    `${origin}/api/v1/mcp-servers/${encodeURIComponent(manifest.name)}/tools`,
  );
  invariant(Array.isArray(listed?.data), "connector tool read-back must contain data");
  invariant(
    listed.data.every((tool) => tool?.preload === true),
    "connector tools must be preloaded in the runtime projection",
  );
  const projectedTools = listed.data.map(({ preload: _preload, ...tool }) => tool);
  invariant(
    JSON.stringify(canonicalize(projectedTools)) === JSON.stringify(canonicalize(getBridgeTools())),
    "connector tool read-back mismatch",
  );
  return { name: manifest.name, toolNames: listed.data.map(({ name }) => name) };
}

export async function runCli(args = process.argv.slice(2), { writeLine = console.log } = {}) {
  invariant(
    args.length === 1 && ["--offline", "--serve", "--register"].includes(args[0]),
    "usage: node scripts/trueforge-render-bridge.mjs --offline|--serve|--register",
  );
  const connector = validateConnectorManifest(await loadConnectorManifest());
  if (args[0] === "--offline") {
    const result = { connector: connector.name, toolNames: getBridgeTools().map(({ name }) => name) };
    writeLine(`OFFLINE_VALID ${JSON.stringify(result)}`);
    return result;
  }
  if (args[0] === "--register") {
    const result = await syncRenderBridgeConnector(connector);
    writeLine(`LIVE_CONNECTOR_VALID ${JSON.stringify(result)}`);
    return result;
  }
  const server = createBridgeServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(8791, "127.0.0.1", resolve);
  });
  writeLine(`BRIDGE_READY ${BRIDGE_ORIGIN}/mcp`);
  return new Promise((resolve) => server.once("close", resolve));
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : undefined;
if (invokedPath === import.meta.url) {
  runCli().catch((error) => {
    console.error(`DAOHARNESS_RENDER_BRIDGE_ERROR ${error.message}`);
    process.exitCode = 1;
  });
}
