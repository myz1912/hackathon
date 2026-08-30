#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const MODEL_SENTINEL = "__TRUEFORGE_MODEL__";
export const REQUIRED_SUBAGENTS = [
  "Viral Trend Researcher",
  "Media Analyst",
];
export const REQUIRED_SKILLS = [
  "daobrew-video",
  "hyperframes",
  "hyperframes-core",
  "hyperframes-cli",
  "general-video",
  "media-use",
  "hyperframes-audio",
];
export const DIRECTION_FIELDS = [
  "style_id",
  "audience",
  "hook_strategy",
  "tone",
  "layout",
  "overlay_cadence",
  "audio_profile",
  "rationale",
];
export const ALLOWED_STYLE_IDS = [
  "event-energy",
  "dark-premium",
  "credibility-proof",
  "sarcastic_reaction",
];
export const SMOKE_SUBAGENT_TASKS = Object.freeze({
  "Viral Trend Researcher":
    "READ_ONLY_TASK: Research current public LinkedIn format patterns for the official TrueForge event with Bright Data, return direct source URLs, and do not mutate, render, package, approve, or publish.",
  "Media Analyst":
    "READ_ONLY_TASK: Independently inspect only the supplied synthetic media metadata and return source-grounded timecode observations; do not mutate, render, package, approve, or publish.",
});

export const SMOKE_USER_PROMPT = [
  "Run only the topology smoke. The audience is event hosters deciding how to reuse event footage. The goal is to show how owned event footage can become a LinkedIn GTM package.",
  `Create Viral Trend Researcher with this exact task input: ${SMOKE_SUBAGENT_TASKS["Viral Trend Researcher"]}`,
  `Create Media Analyst with this exact task input: ${SMOKE_SUBAGENT_TASKS["Media Analyst"]}`,
  "Viral Trend Researcher must make at least one Bright Data read-only MCP call about the official TrueForge event and return source URLs. Media Analyst must independently inspect only this synthetic metadata: one owned 30-second landscape clip, no local path.",
  "Before planning, read and use the configured daobrew-video skill as the governing craft contract. Return only a bounded, source-grounded edit plan with exactly three distinct selectable directions, status pending_approval, publishing_mode package_only, external_action false, approval_valid false, and approval_receipt null.",
  "The first recommended direction must use style_id event-energy, hook_strategy outcome-led, tone warm-editorial, and layout event-energy.",
  "Exactly one direction must use style_id sarcastic_reaction. Label it a creative, unvalidated virality hypothesis, not a performance claim. For that direction use exactly: hook_strategy 'deadpan hooks'; layout 'awkward real reactions with brief punch-ins and hard cuts'; rationale 'Creative unvalidated virality hypothesis, not a performance claim.'; audio_profile 'sarcastic_reaction foreground confident music contrast with original visible-speaker voices and room ambience mixed 6-10 dB lower; music dip limited to 1-2 dB'.",
  "For every non-sarcastic direction, audio_profile must be exactly '<style_id> foreground music with original visible-speaker voices and room ambience mixed 6-10 dB lower; music dip limited to 1-2 dB'. Every direction must use overlay_cadence exactly 'no subtitles by default'.",
  "Every direction must keep music clearly audible in the foreground and preserve original visible-speaker voices and room ambience 6-10 dB lower. Do not generate subtitles unless the user requests them. Do not render or act externally.",
].join(" ");

const REQUIRED_APPROVAL_FIELDS = [
  "run_id",
  "event_digest",
  "viral_digest",
  "media_manifest_digest",
  "edit_plan_digest",
  "approver",
  "approved_at",
];
const APPROVAL_RECEIPT_FIELDS = [...REQUIRED_APPROVAL_FIELDS, "revoked"];
const OUTPUT_FIELDS = [
  "status",
  "publishing_mode",
  "external_action",
  "approval_valid",
  "approval_receipt",
  "summary",
  "sources",
  "directions",
];
const REQUIRED_INSTRUCTION_CONTRACTS = [
  ["DIRECTION_COUNT=3", "DIRECTION_COUNT"],
  [
    "EVENT_HOSTERS_DIRECTION=event-energy|hook=outcome-led|tone=warm-editorial|layout=event-energy",
    "EVENT_HOSTERS_DIRECTION",
  ],
  [
    "PRODUCT_TECHNICAL_BUYERS_DIRECTION=dark-premium|hook=process-proof-led|tone=dark-premium|layout=process-proof-led",
    "PRODUCT_TECHNICAL_BUYERS_DIRECTION",
  ],
  [
    "SPONSORS_PARTNERS_DIRECTION=credibility-proof|hook=credibility-proof-led|tone=credible-editorial|layout=proof-led",
    "SPONSORS_PARTNERS_DIRECTION",
  ],
  ["SUBTITLES_DEFAULT=off-unless-user-requests", "SUBTITLES_DEFAULT"],
  ["MIX_PROFILE=jazz_foreground_ambient_voice_v1", "MIX_PROFILE"],
  ["MUSIC_ROLE=foreground-clearly-audible-throughout", "MUSIC_ROLE"],
  ["ROOM_VOICE_ROLE=ambient-6-to-10-db-below-music", "ROOM_VOICE_ROLE"],
  ["MUSIC_DIP=at-most-2-db", "MUSIC_DIP"],
  ["FINAL_LOUDNESS=-14-to-16-LUFS", "FINAL_LOUDNESS"],
  ["TRUE_PEAK=at-or-below-minus-1-dBTP", "TRUE_PEAK"],
  [
    "SARCASTIC_REACTION_DIRECTION=creative-unvalidated-virality-hypothesis|shots=awkward-real-reactions+brief-punch-ins+hard-cuts|copy=deadpan-hooks|music=confident-music-contrast",
    "SARCASTIC_REACTION_DIRECTION",
  ],
  ["SARCASTIC_REACTION_PERFORMANCE_CLAIM=prohibited", "SARCASTIC_REACTION_PERFORMANCE_CLAIM"],
  ["SIMPLE_NEED=Make this event reach more people", "SIMPLE_NEED"],
  [
    "OUTCOME_QUESTION=Which business outcome should this Event GTM capability optimize for?",
    "OUTCOME_QUESTION",
  ],
  ["OUTCOME_1=Grow the next event's reach (Recommended)", "OUTCOME_1"],
  ["OUTCOME_2=Prove sponsor value", "OUTCOME_2"],
  ["OUTCOME_3=Build a repeatable Event GTM asset", "OUTCOME_3"],
];
const API_TIMEOUT_MS = 10_000;
const TURN_TIMEOUT_MS = 120_000;

export class LiveBlocker extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "LiveBlocker";
    this.code = code;
    this.details = details;
  }
}

function invariant(condition, message) {
  if (!condition) {
    throw new Error(`manifest invariant failed: ${message}`);
  }
}

function sameArray(actual, expected) {
  return (
    Array.isArray(actual) &&
    actual.length === expected.length &&
    actual.every((value, index) => value === expected[index])
  );
}

function sameKeySet(value, expected) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === expected.length &&
    expected.every((key) => Object.hasOwn(value, key))
  );
}

function sortDeep(value) {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, sortDeep(value[key])]),
  );
}

function canonicalContractToken(value) {
  return value.trim().toLowerCase().replace(/[_\s]+/g, "-");
}

function normalizeRegisteredManifest(source) {
  const manifest = structuredClone(source);
  manifest.mcp_servers = (manifest.mcp_servers ?? []).map((server) => ({
    enable_tools: ["@all"],
    disable_tools: [],
    preload_tools: [],
    require_approval_for_tools: ["@write", "@destructive"],
    preload: false,
    ...server,
  }));
  manifest.config = {
    iteration_limit: 100,
    ...manifest.config,
    sandbox: {
      enabled: false,
      file_downloads: true,
      ...manifest.config?.sandbox,
    },
    dynamic_sub_agents: {
      enabled: true,
      ...manifest.config?.dynamic_sub_agents,
    },
    context_management: {
      ...manifest.config?.context_management,
      compaction: {
        enabled: true,
        ...manifest.config?.context_management?.compaction,
      },
      large_tool_response: {
        enabled: true,
        ...manifest.config?.context_management?.large_tool_response,
      },
    },
    generative_ui: {
      enabled: true,
      ...manifest.config?.generative_ui,
    },
    ask_user_questions: {
      enabled: true,
      ...manifest.config?.ask_user_questions,
    },
  };
  return sortDeep(manifest);
}

export function validateManifest(document) {
  invariant(document && typeof document === "object", "document must be an object");
  invariant(document.name === "post-director", "root name must be post-director");

  const manifest = document.manifest;
  invariant(manifest && typeof manifest === "object", "manifest is required");
  invariant(
    manifest.model?.name === MODEL_SENTINEL,
    `model.name must be ${MODEL_SENTINEL}`,
  );
  invariant(
    manifest.config?.dynamic_sub_agents?.enabled === true,
    "dynamic_sub_agents must be enabled",
  );
  invariant(
    manifest.config?.sandbox?.enabled === true,
    "sandbox must be enabled for configured skills",
  );
  invariant(
    manifest.config?.sandbox?.file_downloads === true,
    "sandbox file downloads must be enabled for configured skills",
  );
  invariant(
    manifest.config?.generative_ui?.enabled === true,
    "native generative UI must be enabled",
  );
  invariant(
    manifest.config?.ask_user_questions?.enabled === true,
    "root approval questions must be enabled",
  );

  invariant(
    Array.isArray(manifest.mcp_servers) && manifest.mcp_servers.length === 2,
    "exactly two scoped MCP connectors must be attached",
  );
  const connector = manifest.mcp_servers[0];
  invariant(connector.name === "bright-data", "connector must be bright-data");
  invariant(
    sameArray(connector.enable_tools, ["@read-only"]),
    "bright-data enable_tools must be exactly [\"@read-only\"]",
  );
  invariant(
    sameArray(connector.require_approval_for_tools, ["@write", "@destructive"]),
    "approval selectors must remain @write and @destructive",
  );
  invariant(sameArray(connector.disable_tools, []), "disable_tools must be explicit and empty");
  invariant(sameArray(connector.preload_tools, []), "preload_tools must be explicit and empty");
  invariant(connector.preload === false, "Bright Data tools must stay deferred");
  const renderConnector = manifest.mcp_servers[1];
  invariant(
    renderConnector.name === "daoharness-render-bridge",
    "second connector must be daoharness-render-bridge",
  );
  invariant(
    sameArray(renderConnector.enable_tools, ["inspect_event_media", "render_event_gtm"]),
    "render connector must expose only inspect_event_media and render_event_gtm",
  );
  invariant(sameArray(renderConnector.disable_tools, []), "render connector disable_tools must be empty");
  invariant(
    sameArray(renderConnector.preload_tools, ["inspect_event_media", "render_event_gtm"]),
    "render connector tools must be preloaded by exact name",
  );
  invariant(
    sameArray(renderConnector.require_approval_for_tools, ["render_event_gtm"]),
    "render_event_gtm must require native tool approval",
  );
  invariant(renderConnector.preload === false, "render connector must stay scoped and deferred");

  invariant(
    Array.isArray(manifest.skills) && manifest.skills.length === REQUIRED_SKILLS.length,
    `skills must contain exactly ${REQUIRED_SKILLS.join(", ")}`,
  );
  for (const [index, name] of REQUIRED_SKILLS.entries()) {
    const skill = manifest.skills[index];
    invariant(
      skill &&
        typeof skill === "object" &&
        !Array.isArray(skill) &&
        Object.keys(skill).length === 1 &&
        Object.hasOwn(skill, "name"),
      "skills must be exact name-only references",
    );
    invariant(skill.name === name, `skills must preserve the required order at ${name}`);
  }

  const outputSchema = manifest.response_format?.json_schema?.schema;
  invariant(
    manifest.response_format?.type === "json_schema" &&
      manifest.response_format.json_schema.strict === true &&
      outputSchema,
    "a JSON Schema runtime output contract is required",
  );
  invariant(
    outputSchema.type === "object" && outputSchema.additionalProperties === false,
    "output schema must be a strict object",
  );
  invariant(
    sameArray(outputSchema.required, OUTPUT_FIELDS),
    `output schema must require exactly ${OUTPUT_FIELDS.join(", ")}`,
  );
  invariant(
    sameKeySet(outputSchema.properties, OUTPUT_FIELDS),
    `output schema properties must be exactly ${OUTPUT_FIELDS.join(", ")}`,
  );
  invariant(
    !Object.hasOwn(outputSchema, "allOf"),
    "output schema must avoid provider-incompatible allOf; runtime validation enforces status binding",
  );
  invariant(
    outputSchema.properties?.status?.type === "string" &&
      sameArray(outputSchema.properties.status.enum, ["pending_approval", "approved_package"]),
    "output schema must preserve the exact status enum",
  );
  invariant(
    outputSchema.properties?.publishing_mode?.type === "string" &&
      outputSchema.properties.publishing_mode.const === "package_only",
    "output schema must fix publishing_mode to package_only",
  );
  invariant(
    outputSchema.properties?.external_action?.type === "boolean" &&
      outputSchema.properties.external_action.const === false,
    "output schema must fix external_action to false",
  );
  invariant(
    outputSchema.properties?.approval_valid?.type === "boolean",
    "output schema must require boolean approval_valid",
  );
  const approvalReceipt = outputSchema.properties?.approval_receipt;
  invariant(
    sameArray(approvalReceipt?.type, ["object", "null"]) &&
      approvalReceipt.additionalProperties === false &&
      sameArray(approvalReceipt.required, APPROVAL_RECEIPT_FIELDS) &&
      sameKeySet(approvalReceipt.properties, APPROVAL_RECEIPT_FIELDS),
    "output schema must require a strict nullable digest-bound approval receipt",
  );
  for (const field of REQUIRED_APPROVAL_FIELDS) {
    invariant(
      approvalReceipt.properties?.[field]?.type === "string",
      `approval receipt schema must require string field ${field}`,
    );
  }
  invariant(
    approvalReceipt.properties?.revoked?.type === "boolean" &&
      approvalReceipt.properties.revoked.const === false,
    "approval receipt schema must fail closed on revoked approval",
  );
  invariant(
    outputSchema.properties?.summary?.type === "string",
    "output schema must require a string summary",
  );
  invariant(
    outputSchema.properties?.sources?.minItems === 1,
    "output schema must require at least one source URL",
  );
  const directionsSchema = outputSchema.properties?.directions;
  invariant(
    directionsSchema?.type === "array" &&
      directionsSchema.minItems === 3 &&
      directionsSchema.maxItems === 3,
    "output schema must require exactly three directions",
  );
  const directionItem = directionsSchema.items;
  invariant(
    directionItem?.type === "object" && directionItem.properties,
    "each direction must be a structured object",
  );
  invariant(
    sameKeySet(directionItem.properties, DIRECTION_FIELDS),
    `direction schema properties must be exactly ${DIRECTION_FIELDS.join(", ")}`,
  );
  for (const field of DIRECTION_FIELDS) {
    invariant(
      directionItem.properties[field]?.type === "string" &&
        directionItem.required?.includes(field),
      `direction schema must require string field ${field}`,
    );
  }
  invariant(
    sameArray(directionItem.properties.style_id.enum, ALLOWED_STYLE_IDS),
    `direction style_id schema must be exactly ${ALLOWED_STYLE_IDS.join(", ")}`,
  );
  invariant(
    directionItem.additionalProperties === false,
    "direction schema must reject additional properties",
  );
  invariant(
    outputSchema.required?.includes("directions"),
    "runtime output must require directions",
  );

  const instructions = manifest.instructions;
  invariant(typeof instructions === "string", "instructions are required");
  invariant(
    instructions.includes("DYNAMIC_SUBAGENT_COUNT=2"),
    "DYNAMIC_SUBAGENT_COUNT must equal 2",
  );
  const declaredSubagents = [...instructions.matchAll(/^DYNAMIC_SUBAGENT_\d+_NAME=(.+)$/gm)].map(
    (match) => match[1].trim(),
  );
  invariant(
    sameArray(declaredSubagents, REQUIRED_SUBAGENTS),
    `dynamic subagents must be exactly ${REQUIRED_SUBAGENTS.join(" and ")}`,
  );
  invariant(
    instructions.includes("create_sub_agent exactly twice"),
    "root must call create_sub_agent exactly twice",
  );
  invariant(
    instructions.includes("never create another subagent"),
    "a third runtime agent must be prohibited",
  );
  for (const field of REQUIRED_APPROVAL_FIELDS) {
    invariant(instructions.includes(field), `approval contract must bind ${field}`);
  }
  invariant(
    /missing, stale, mismatched, or revoked approval fails closed/i.test(instructions),
    "approval must fail closed",
  );
  invariant(
    /publishing_mode[^\n]*package_only/i.test(instructions),
    "publishing_mode must be package_only",
  );
  invariant(
    /external_action[^\n]*false/i.test(instructions),
    "external_action must be false",
  );
  for (const [contract, label] of REQUIRED_INSTRUCTION_CONTRACTS) {
    invariant(instructions.includes(contract), `${label} instruction contract is required`);
  }

  return {
    root: document.name,
    subagents: [...REQUIRED_SUBAGENTS],
    skills: [...REQUIRED_SKILLS],
    connector: connector.name,
    directionCount: 3,
    requiredStyleId: "sarcastic_reaction",
    publishingMode: "package_only",
    externalAction: false,
  };
}

export function validateRuntimeSkills(skills) {
  if (!Array.isArray(skills)) {
    throw new LiveBlocker(
      "required_skills_mismatched",
      "GET /api/v1/skills did not return a skill array",
      {
        availableSkillCount: 0,
        requiredSkillCount: REQUIRED_SKILLS.length,
        mismatchedSkills: [...REQUIRED_SKILLS],
      },
    );
  }

  const missingSkills = [];
  const mismatchedSkills = [];
  for (const name of REQUIRED_SKILLS) {
    const matching = skills.filter((skill) => skill?.name === name);
    if (matching.length === 0) {
      missingSkills.push(name);
      continue;
    }
    if (
      matching.length !== 1 ||
      typeof matching[0].description !== "string" ||
      matching[0].description.trim().length === 0
    ) {
      mismatchedSkills.push(name);
    }
  }

  if (missingSkills.length > 0) {
    throw new LiveBlocker(
      "required_skills_missing",
      "GET /api/v1/skills is missing skills required by post-director",
      {
        availableSkillCount: skills.length,
        requiredSkillCount: REQUIRED_SKILLS.length,
        missingSkills,
      },
    );
  }
  if (mismatchedSkills.length > 0) {
    throw new LiveBlocker(
      "required_skills_mismatched",
      "GET /api/v1/skills returned malformed or duplicate required skills",
      {
        availableSkillCount: skills.length,
        requiredSkillCount: REQUIRED_SKILLS.length,
        mismatchedSkills,
      },
    );
  }

  return {
    availableSkillCount: skills.length,
    requiredSkillCount: REQUIRED_SKILLS.length,
  };
}

export function selectRuntimeModel(models, requestedModel) {
  const names = models
    .map((model) => (typeof model === "string" ? model : model?.name))
    .filter((name) => typeof name === "string" && name.length > 0);

  if (names.length === 0) {
    throw new LiveBlocker(
      "empty_model_registry",
      "GET /api/v1/models returned no configured models",
      { modelCount: 0 },
    );
  }
  if (requestedModel) {
    if (!names.includes(requestedModel)) {
      throw new LiveBlocker(
        "requested_model_unavailable",
        "TRUEFORGE_MODEL is not present in the runtime model registry",
        { modelCount: names.length },
      );
    }
    return requestedModel;
  }
  if (names.length === 1) {
    return names[0];
  }
  throw new LiveBlocker(
    "model_selection_required",
    "multiple runtime models are configured; set TRUEFORGE_MODEL to an exact listed FQN",
    { modelCount: names.length },
  );
}

export function buildRegistrationPayload(document, modelName) {
  validateManifest(document);
  invariant(typeof modelName === "string" && modelName.length > 0, "runtime model is required");
  const payload = structuredClone(document);
  payload.manifest.model.name = modelName;
  return payload;
}

export function validateApproval(current, approval) {
  invariant(current && typeof current === "object", "current digest set is required");
  invariant(approval && typeof approval === "object", "approval is required");
  for (const field of REQUIRED_APPROVAL_FIELDS.slice(0, 5)) {
    invariant(typeof current[field] === "string" && current[field].length > 0, `${field} is required`);
    invariant(approval[field] === current[field], `${field} mismatch`);
  }
  invariant(typeof approval.approver === "string" && approval.approver.trim(), "approver is required");
  invariant(
    typeof approval.approved_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(approval.approved_at) &&
      !Number.isNaN(Date.parse(approval.approved_at)),
    "approved_at must be an ISO timestamp",
  );
  invariant(
    new Date(Date.parse(approval.approved_at)).toISOString() === approval.approved_at,
    "approved_at must represent a valid calendar date",
  );
  invariant(Date.parse(approval.approved_at) <= Date.now(), "approved_at must not be in the future");
  invariant(approval.revoked !== true, "approval is revoked");
  return true;
}

export function validatePackageBoundary(output, approvalContext) {
  invariant(output && typeof output === "object", "runtime output must be an object");
  invariant(
    output.status === "pending_approval" || output.status === "approved_package",
    "status must be pending_approval or approved_package",
  );
  invariant(output.publishing_mode === "package_only", "publishing_mode must be package_only");
  invariant(output.external_action === false, "external_action must be false");
  invariant(
    Object.keys(output).length === OUTPUT_FIELDS.length &&
      Object.keys(output).every((field) => OUTPUT_FIELDS.includes(field)),
    `runtime output must contain exactly ${OUTPUT_FIELDS.join(", ")}`,
  );
  invariant(
    typeof output.summary === "string" && output.summary.trim().length > 0,
    "runtime output must include a non-empty summary",
  );
  invariant(
    Array.isArray(output.sources) &&
      output.sources.length > 0 &&
      output.sources.every((source) => {
        try {
          const url = new URL(source);
          return url.protocol === "https:" || url.protocol === "http:";
        } catch {
          return false;
        }
      }),
    "at least one direct HTTP(S) source URL is required",
  );
  invariant(
    Array.isArray(output.directions) && output.directions.length === 3,
    "runtime output must contain exactly three directions",
  );
  for (const [index, direction] of output.directions.entries()) {
    invariant(
      direction && typeof direction === "object" && !Array.isArray(direction),
      `direction ${index + 1} must be an object`,
    );
    for (const field of DIRECTION_FIELDS) {
      invariant(
        typeof direction[field] === "string" && direction[field].trim().length > 0,
        `direction ${index + 1} must include ${field}`,
      );
    }
    invariant(
      Object.keys(direction).every((field) => DIRECTION_FIELDS.includes(field)),
      `direction ${index + 1} must not include additional properties`,
    );
  }
  const styleIds = output.directions.map((direction) => direction.style_id);
  invariant(
    styleIds.every((styleId) => ALLOWED_STYLE_IDS.includes(styleId)),
    `runtime directions must use an allowed style_id: ${ALLOWED_STYLE_IDS.join(", ")}`,
  );
  invariant(
    new Set(styleIds).size === styleIds.length,
    "runtime directions must use distinct style_id values",
  );
  const sarcasticDirections = output.directions.filter(
    (direction) => direction.style_id === "sarcastic_reaction",
  );
  invariant(
    sarcasticDirections.length === 1,
    "runtime output must contain exactly one sarcastic_reaction direction",
  );
  const sarcastic = sarcasticDirections[0];
  invariant(
    sarcastic.rationale.trim().toLowerCase() ===
      "creative unvalidated virality hypothesis, not a performance claim.",
    "sarcastic_reaction must use the exact unvalidated creative hypothesis label",
  );
  invariant(
    canonicalContractToken(sarcastic.layout) ===
      "awkward-real-reactions-with-brief-punch-ins-and-hard-cuts",
    "sarcastic_reaction must use the exact sarcastic_reaction layout",
  );
  invariant(
    canonicalContractToken(sarcastic.hook_strategy) === "deadpan-hooks",
    "sarcastic_reaction must use the exact sarcastic_reaction hook",
  );
  for (const [index, direction] of output.directions.entries()) {
    const expectedAudio =
      direction.style_id === "sarcastic_reaction"
        ? "sarcastic_reaction foreground confident music contrast with original visible-speaker voices and room ambience mixed 6-10 dB lower; music dip limited to 1-2 dB"
        : `${direction.style_id} foreground music with original visible-speaker voices and room ambience mixed 6-10 dB lower; music dip limited to 1-2 dB`;
    invariant(
      canonicalContractToken(direction.audio_profile) === canonicalContractToken(expectedAudio),
      `direction ${index + 1} audio_profile must use the exact direction media contract`,
    );
    invariant(
      canonicalContractToken(direction.overlay_cadence) === "no-subtitles-by-default",
      `direction ${index + 1} overlay_cadence must use the exact no-subtitles default`,
    );
  }
  if (output.status === "approved_package") {
    invariant(output.approval_valid === true, "approved_package requires approval_valid true");
    invariant(
      approvalContext?.current && approvalContext?.approval,
      "approved_package requires a bound approval receipt",
    );
    invariant(
      output.approval_receipt && typeof output.approval_receipt === "object",
      "approved_package requires a native approval receipt",
    );
    for (const field of APPROVAL_RECEIPT_FIELDS) {
      invariant(
        output.approval_receipt[field] === approvalContext.approval[field],
        `approval receipt mismatch for ${field}`,
      );
    }
    validateApproval(approvalContext.current, output.approval_receipt);
    validateApproval(approvalContext.current, approvalContext.approval);
  } else {
    invariant(output.approval_valid === false, "pending_approval requires approval_valid false");
    invariant(
      output.approval_receipt === null,
      "pending_approval requires a null approval receipt",
    );
  }
  return true;
}

export function validateEventHosterSmokeDirections(directions) {
  invariant(
    Array.isArray(directions) && directions.length === 3,
    "event-hoster smoke must contain exactly three directions",
  );
  const first = directions[0];
  invariant(
    first.style_id === "event-energy",
    "event-hoster first recommendation must use style_id event-energy",
  );
  invariant(
    canonicalContractToken(first.hook_strategy) === "outcome-led",
    "event-hoster first recommendation must use an outcome-led hook",
  );
  invariant(
    canonicalContractToken(first.tone) === "warm-editorial",
    "event-hoster first recommendation must use a warm-editorial tone",
  );
  invariant(
    canonicalContractToken(first.layout) === "event-energy",
    "event-hoster first recommendation must use an event-energy layout",
  );
  return true;
}

export function validateEventHosterSmokeSources(sources) {
  const officialEventSources = new Set([
    "https://luma.com/agent-harness",
    "https://www.wemakedevs.org/hackathons/trueforge",
    "https://www.wemakedevs.org/hackathons/trueforge/rules",
    "https://www.wemakedevs.org/blogs/agent-harness-hackathon-kick-off",
  ]);
  invariant(
    sources.length > 0 &&
      sources.every((source) => {
      try {
        const url = new URL(source);
        return (
          url.protocol === "https:" &&
          url.username === "" &&
          url.password === "" &&
          url.search === "" &&
          url.hash === "" &&
          officialEventSources.has(source)
        );
      } catch {
        return false;
      }
    }),
    "event-hoster smoke must include an official Luma or WeMakeDevs source",
  );
  return true;
}

export function validateExistingAgent(existing, payload) {
  try {
    invariant(existing?.id, "existing agent id is required");
    invariant(existing.name === payload.name, "existing agent name changed");
    invariant(
      existing.manifest?.model?.name === payload.manifest.model.name,
      "existing agent model changed",
    );
    const candidate = structuredClone({
      name: existing.name,
      manifest: existing.manifest,
    });
    candidate.manifest.model.name = MODEL_SENTINEL;
    validateManifest(candidate);
    invariant(
      JSON.stringify(normalizeRegisteredManifest(existing.manifest)) ===
        JSON.stringify(normalizeRegisteredManifest(payload.manifest)),
      "existing agent manifest changed",
    );
    return existing.id;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`existing post-director does not match the scoped manifest: ${reason}`);
  }
}

export function summarizeLiveEvidence(
  events,
  { brightDataReadOnlyToolNames = [] } = {},
) {
  const threadEvents = events.filter((event) => event?.type === "thread.created");
  const threadNames = threadEvents.map((event) => event.agent_info?.name);
  const threadIds = threadEvents.map((event) => event.thread_id);
  const threadByName = new Map(
    threadEvents.map((event) => [event.agent_info?.name, event.thread_id]),
  );
  const dynamicReadOnlyTopologyValid =
    threadEvents.length === 2 &&
    new Set(threadIds).size === 2 &&
    threadEvents.every(
      (event) =>
        typeof event.thread_id === "string" &&
        event.thread_id.length > 0 &&
        event.agent_info?.type === "dynamic" &&
        typeof event.agent_info?.input === "string" &&
        event.agent_info.input === SMOKE_SUBAGENT_TASKS[event.agent_info.name],
    );
  const threadDoneEvents = events.filter((event) => event?.type === "thread.done");
  const completedThreadIds = new Set(
    threadDoneEvents
      .filter((event) => event.state?.status === "done")
      .map((event) => event.thread_id),
  );
  const viralThreadId = threadByName.get("Viral Trend Researcher");
  const readOnlyToolNames = new Set(brightDataReadOnlyToolNames);
  const brightDataCalls = [];

  for (const event of events) {
    if (
      event?.type !== "model.message" ||
      event.thread_id !== viralThreadId ||
      !Array.isArray(event.tool_calls)
    ) {
      continue;
    }
    brightDataCalls.push(
      ...event.tool_calls.filter(
        (call) =>
          typeof call?.id === "string" &&
          call.id.length > 0 &&
        call?.tool_info?.type === "mcp" &&
        call.tool_info.server_name === "bright-data" &&
        typeof call.tool_info.name === "string" &&
        readOnlyToolNames.has(call.tool_info.name),
      ),
    );
  }
  const brightDataCallCount = brightDataCalls.length;

  const turnDoneEvents = events.filter((event) => event?.type === "turn.done");
  const terminalTurn = turnDoneEvents.at(-1);
  let packageBoundaryValid = false;
  let packageSources = [];
  try {
    const content = terminalTurn?.state?.output?.content;
    const text = Array.isArray(content)
      ? content.filter((part) => part?.type === "text").map((part) => part.text).join("")
      : content;
    const output = JSON.parse(text);
    validatePackageBoundary(output);
    validateEventHosterSmokeDirections(output.directions);
    validateEventHosterSmokeSources(output.sources);
    packageSources = output.sources;
    packageBoundaryValid = true;
  } catch {
    packageBoundaryValid = false;
  }
  const brightDataResponseCount = brightDataCalls.filter((call) =>
    events.some(
      (event) =>
        event?.type === "tool.response" &&
        event.thread_id === viralThreadId &&
        event.tool_call_id === call.id &&
        typeof event.content === "string" &&
        packageSources.length > 0 &&
        packageSources.every((source) => event.content.includes(source)),
    ),
  ).length;

  const requiredThreadsCompleted =
    threadDoneEvents.length === 2 &&
    [...threadByName.values()].every((threadId) => completedThreadIds.has(threadId));
  const rootTurnCompleted =
    turnDoneEvents.length === 1 &&
    terminalTurn?.state?.status === "done" &&
    (terminalTurn.state.required_actions?.length ?? 0) === 0;

  return {
    accepted:
      threadEvents.length === 2 &&
      dynamicReadOnlyTopologyValid &&
      new Set(threadNames).size === REQUIRED_SUBAGENTS.length &&
      REQUIRED_SUBAGENTS.every((name) => threadNames.includes(name)) &&
      requiredThreadsCompleted &&
      brightDataCallCount > 0 &&
      brightDataResponseCount > 0 &&
      rootTurnCompleted &&
      packageBoundaryValid,
    threadCreatedCount: threadEvents.length,
    threadNames,
    threadDoneCount: threadDoneEvents.length,
    brightDataCallCount,
    brightDataResponseCount,
    dynamicReadOnlyTopologyValid,
    rootTurnCompleted,
    packageBoundaryValid,
  };
}

export function parseSse(text) {
  const events = [];
  for (const block of text.split(/\r?\n\r?\n/)) {
    const data = block
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (!data || data === "[DONE]") continue;
    events.push(JSON.parse(data));
  }
  return events;
}

async function readJson(response, label) {
  if (!response.ok) {
    throw new Error(`${label} failed with HTTP ${response.status}`);
  }
  return response.json();
}

function fetchBounded(url, options = {}, timeoutMs = API_TIMEOUT_MS) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
}

async function getRuntimeState(baseUrl) {
  const [modelsResponse, serversResponse, toolsResponse, renderToolsResponse, skillsResponse] = await Promise.all([
    fetchBounded(`${baseUrl}/api/v1/models`),
    fetchBounded(`${baseUrl}/api/v1/mcp-servers`),
    fetchBounded(`${baseUrl}/api/v1/mcp-servers/bright-data/tools`),
    fetchBounded(`${baseUrl}/api/v1/mcp-servers/daoharness-render-bridge/tools`),
    fetchBounded(`${baseUrl}/api/v1/skills`),
  ]);
  const [modelsBody, serversBody, toolsBody, renderToolsBody, skillsBody] = await Promise.all([
    readJson(modelsResponse, "model registry read"),
    readJson(serversResponse, "MCP registry read"),
    readJson(toolsResponse, "Bright Data tool catalog read"),
    readJson(renderToolsResponse, "render bridge tool catalog read"),
    readJson(skillsResponse, "skill registry read"),
  ]);
  const models = Array.isArray(modelsBody.data) ? modelsBody.data : [];
  const servers = Array.isArray(serversBody.data) ? serversBody.data : [];
  const tools = Array.isArray(toolsBody.data) ? toolsBody.data : [];
  const renderTools = Array.isArray(renderToolsBody.data) ? renderToolsBody.data : [];
  const skills = skillsBody.data;
  if (!servers.some((server) => server.name === "bright-data")) {
    throw new LiveBlocker(
      "bright_data_connector_missing",
      "the existing bright-data MCP connector is not registered",
      { connectorCount: servers.length },
    );
  }
  if (tools.length === 0) {
    throw new LiveBlocker(
      "bright_data_tools_missing",
      "the bright-data MCP connector exposes no tools",
      { connectorCount: servers.length, toolCount: 0 },
    );
  }
  if (!servers.some((server) => server.name === "daoharness-render-bridge")) {
    throw new LiveBlocker(
      "render_bridge_connector_missing",
      "the daoharness-render-bridge MCP connector is not registered",
      { connectorCount: servers.length },
    );
  }
  const renderToolNames = renderTools.map((tool) => tool?.name);
  if (
    renderToolNames.length !== 2 ||
    !renderToolNames.includes("inspect_event_media") ||
    !renderToolNames.includes("render_event_gtm")
  ) {
    throw new LiveBlocker(
      "render_bridge_tools_mismatched",
      "the render bridge must expose exactly inspect_event_media and render_event_gtm",
      { connectorCount: servers.length, renderToolCount: renderTools.length },
    );
  }
  return {
    models,
    skills,
    connectorCount: servers.length,
    brightDataToolCount: tools.length,
    renderToolCount: renderTools.length,
    brightDataReadOnlyToolNames: tools
      .filter(
        (tool) =>
          typeof tool?.name === "string" && tool.annotations?.readOnlyHint === true,
      )
      .map((tool) => tool.name),
  };
}

async function registerAgent(baseUrl, payload) {
  const agentsBody = await readJson(
    await fetchBounded(`${baseUrl}/api/v1/agents`),
    "agent registry read",
  );
  const existing = (agentsBody.data ?? []).find((agent) => agent.name === payload.name);
  if (existing) {
    return { id: validateExistingAgent(existing, payload), created: false };
  }

  const createdBody = await readJson(
    await fetchBounded(`${baseUrl}/api/v1/agents`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }),
    "post-director registration",
  );
  return { id: createdBody.data.id, created: true };
}

async function executeLiveSmoke(baseUrl) {
  let sessionId;
  try {
    const sessionBody = await readJson(
      await fetchBounded(`${baseUrl}/api/v1/sessions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agent: { name: "post-director" } }),
      }),
      "post-director session create",
    );
    sessionId = sessionBody.data.id;
    const response = await fetchBounded(
      `${baseUrl}/api/v1/sessions/${sessionId}/turns`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          stream: true,
          input: [
            {
              type: "user.message",
              content: SMOKE_USER_PROMPT,
            },
          ],
        }),
      },
      TURN_TIMEOUT_MS,
    );
    if (!response.ok) {
      throw new Error(`turn execution failed with HTTP ${response.status}`);
    }
    return { sessionId, events: parseSse(await response.text()) };
  } catch (error) {
    if (sessionId) {
      try {
        await fetchBounded(`${baseUrl}/api/v1/sessions/${sessionId}/cancel`, {
          method: "POST",
        });
      } catch {
        // Preserve the original smoke failure; cancellation is best-effort cleanup.
      }
    }
    throw error;
  }
}

async function main() {
  const mode = process.argv[2] ?? "--offline";
  if (!["--offline", "--live-preflight", "--live"].includes(mode)) {
    throw new Error("usage: node scripts/trueforge-smoke.mjs [--offline|--live-preflight|--live]");
  }

  const manifestPath = path.resolve(
    process.env.TRUEFORGE_MANIFEST ?? "trueforge/post-director.agent.json",
  );
  const document = JSON.parse(await readFile(manifestPath, "utf8"));
  const offline = validateManifest(document);

  if (mode === "--offline") {
    console.log(JSON.stringify({ status: "OFFLINE_VALID", ...offline }, null, 2));
    return;
  }

  const baseUrl = (process.env.TRUEFORGE_URL ?? "http://127.0.0.1:8790").replace(/\/$/, "");
  const runtime = await getRuntimeState(baseUrl);
  try {
    const runtimeModel = selectRuntimeModel(runtime.models, process.env.TRUEFORGE_MODEL);
    const runtimeSkills = validateRuntimeSkills(runtime.skills);
    if (mode === "--live-preflight") {
      console.log(
        JSON.stringify(
          {
            status: "LIVE_READY",
            modelCount: runtime.models.length,
            connectorCount: runtime.connectorCount,
            brightDataToolCount: runtime.brightDataToolCount,
            ...runtimeSkills,
            registrationAttempted: false,
          },
          null,
          2,
        ),
      );
      return;
    }

    const registration = await registerAgent(
      baseUrl,
      buildRegistrationPayload(document, runtimeModel),
    );
    const run = await executeLiveSmoke(baseUrl);
    const evidence = summarizeLiveEvidence(run.events, {
      brightDataReadOnlyToolNames: runtime.brightDataReadOnlyToolNames,
    });
    if (!evidence.accepted) {
      throw new Error("live smoke did not produce exactly two named threads and a Bright Data MCP call");
    }
    console.log(
      JSON.stringify(
        {
          status: "LIVE_ACCEPTED",
          agentCreated: registration.created,
          sessionId: run.sessionId,
          ...evidence,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    if (!(error instanceof LiveBlocker)) throw error;
    console.error(
      JSON.stringify(
        {
          status: "LIVE_BLOCKED",
          blocker: error.code,
          message: error.message,
          ...error.details,
          connectorCount: runtime.connectorCount,
          brightDataToolCount: runtime.brightDataToolCount,
          availableSkillCount: Array.isArray(runtime.skills) ? runtime.skills.length : 0,
          requiredSkillCount: REQUIRED_SKILLS.length,
          registrationAttempted: false,
        },
        null,
        2,
      ),
    );
    process.exitCode = 2;
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
