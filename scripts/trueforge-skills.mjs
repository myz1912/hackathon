#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import { pathToFileURL } from "node:url";

export const DEFAULT_TRUEFORGE_BASE_URL = "http://127.0.0.1:8790";
export const REQUIRED_SKILL_NAMES = Object.freeze([
  "daobrew-video",
  "hyperframes",
  "hyperframes-core",
  "hyperframes-cli",
  "general-video",
  "media-use",
  "hyperframes-audio",
]);

const DAOBREW_SOURCE = Object.freeze({
  url: "https://github.com/DaoBrewAI/building-in-public",
  path: "daobrew-video/skills/daobrew-video",
  ref: "492756d6d204887f1da271c4cab4df5cbcc83717",
});
const HYPERFRAMES_URL = "https://github.com/heygen-com/hyperframes";
const HYPERFRAMES_REF = "0fd70b1d2165d6ac9f4199bfafa9f22c711bfc8f";
const TRUSTED_SOURCES = Object.freeze({
  "daobrew-video": DAOBREW_SOURCE,
  ...Object.fromEntries(
    REQUIRED_SKILL_NAMES.slice(1).map((name) => [
      name,
      Object.freeze({
        url: HYPERFRAMES_URL,
        path: `skills/${name}`,
        ref: HYPERFRAMES_REF,
      }),
    ]),
  ),
});

const SKILLS_URL = new URL("../trueforge/skills.json", import.meta.url);
const SETTINGS_SKILLS_PATH = "/api/v1/settings/skills";
const AVAILABLE_SKILLS_PATH = "/api/v1/skills";
const MANIFEST_FIELDS = Object.freeze([
  "type",
  "name",
  "url",
  "path",
  "ref",
  "description",
]);

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateGitHubUrl(value, name) {
  invariant(typeof value === "string" && value.length > 0, `${name} URL is required`);

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name} URL must be a valid HTTPS GitHub repository URL`);
  }

  invariant(
    parsed.protocol === "https:" && parsed.hostname === "github.com",
    `${name} URL must be an HTTPS GitHub repository URL`,
  );
  invariant(
    parsed.username === "" &&
      parsed.password === "" &&
      parsed.search === "" &&
      parsed.hash === "",
    `${name} URL must not contain credentials, query parameters, or fragments`,
  );
  const segments = parsed.pathname.split("/").filter(Boolean);
  invariant(segments.length === 2, `${name} URL must identify one GitHub repository`);
}

function validatePath(value, name) {
  invariant(
    typeof value === "string" && /^[A-Za-z0-9._/-]+$/.test(value),
    `${name} path is invalid`,
  );
  invariant(!value.startsWith("/") && !value.endsWith("/"), `${name} path must be relative`);
  invariant(
    value.split("/").every((segment) => segment !== "" && segment !== "." && segment !== ".."),
    `${name} path must not traverse outside the repository`,
  );
}

export async function loadSkillManifests(source = SKILLS_URL) {
  return JSON.parse(await readFile(source, "utf8"));
}

export function validateSkillManifests(manifests) {
  invariant(Array.isArray(manifests), "skill manifests must be an array");
  invariant(
    manifests.length === REQUIRED_SKILL_NAMES.length,
    `skill manifests must contain exactly ${REQUIRED_SKILL_NAMES.length} entries`,
  );

  const names = [];
  for (const [index, manifest] of manifests.entries()) {
    invariant(isRecord(manifest), `skill manifest ${index} must be an object`);
    const unsupported = Object.keys(manifest).filter((field) => !MANIFEST_FIELDS.includes(field));
    invariant(
      unsupported.length === 0,
      `${manifest.name ?? `skill manifest ${index}`} has unsupported field ${unsupported[0]}`,
    );
    for (const field of MANIFEST_FIELDS) {
      invariant(Object.hasOwn(manifest, field), `${manifest.name ?? index} is missing ${field}`);
    }

    invariant(manifest.type === "git", `${manifest.name ?? index} type must be git`);
    invariant(
      typeof manifest.name === "string" &&
        /^[a-z](?:[a-z0-9._-]{0,62}[a-z0-9])$/.test(manifest.name),
      `skill manifest ${index} name is invalid`,
    );
    names.push(manifest.name);
    validateGitHubUrl(manifest.url, manifest.name);
    validatePath(manifest.path, manifest.name);
    invariant(
      typeof manifest.ref === "string" && /^[0-9a-f]{40}$/.test(manifest.ref),
      `${manifest.name} ref must be a lowercase 40-character commit SHA`,
    );
    invariant(
      typeof manifest.description === "string" &&
        manifest.description.length > 0 &&
        manifest.description === manifest.description.trim(),
      `${manifest.name} description must be a non-empty trimmed string`,
    );
  }

  invariant(new Set(names).size === names.length, "skill manifest names must be unique");
  invariant(
    REQUIRED_SKILL_NAMES.every((name) => names.includes(name)),
    `skill manifests must contain exactly ${REQUIRED_SKILL_NAMES.join(", ")}`,
  );

  for (const manifest of manifests) {
    const trustedSource = TRUSTED_SOURCES[manifest.name];
    for (const field of ["url", "path", "ref"]) {
      invariant(
        manifest[field] === trustedSource[field],
        `trusted source mapping mismatch for ${manifest.name}: ${field}`,
      );
    }
  }

  return { count: manifests.length, names };
}

function relevantEntries(expected, response, kind) {
  invariant(isRecord(response) && Array.isArray(response.data), `${kind} read-back must contain data`);
  const expectedNames = new Set(expected.map(({ name }) => name));
  return response.data.filter((entry) => expectedNames.has(entry?.name));
}

export function assertConfiguredSkillsMatch(expected, response) {
  validateSkillManifests(expected);
  const entries = relevantEntries(expected, response, "configured");

  for (const manifest of expected) {
    const matches = entries.filter(({ name }) => name === manifest.name);
    invariant(
      matches.length === 1 && isDeepStrictEqual(matches[0], { name: manifest.name, manifest }),
      `configured skill read-back mismatch for ${manifest.name}`,
    );
  }
  return true;
}

export function assertAvailableSkillsMatch(expected, response) {
  validateSkillManifests(expected);
  const entries = relevantEntries(expected, response, "available");

  for (const { name, description } of expected) {
    const matches = entries.filter((entry) => entry?.name === name);
    invariant(
      matches.length === 1 && isDeepStrictEqual(matches[0], { name, description }),
      `available skill read-back mismatch for ${name}`,
    );
  }
  return true;
}

export function normalizeBaseUrl(value) {
  invariant(typeof value === "string" && value.trim() !== "", "TrueForge base URL is required");

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("TrueForge base URL must be a valid HTTP URL");
  }

  invariant(
    parsed.protocol === "http:" || parsed.protocol === "https:",
    "TrueForge base URL must use HTTP or HTTPS",
  );
  invariant(
    parsed.username === "" && parsed.password === "",
    "TrueForge base URL must not embed credentials",
  );
  invariant(
    (parsed.pathname === "" || parsed.pathname === "/") &&
      parsed.search === "" &&
      parsed.hash === "",
    "TrueForge base URL must contain an origin only",
  );
  return parsed.origin;
}

async function requestJson(fetchImpl, baseUrl, path, { method = "GET", body } = {}) {
  invariant(typeof fetchImpl === "function", "a fetch implementation is required");
  const init = { method };
  if (body !== undefined) {
    init.headers = { "content-type": "application/json" };
    init.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetchImpl(`${baseUrl}${path}`, init);
  } catch (cause) {
    throw new Error(`TrueForge ${method} ${path} request failed`, { cause });
  }
  invariant(
    response && typeof response.json === "function",
    `TrueForge ${method} ${path} returned an invalid response`,
  );
  invariant(
    response.ok,
    `TrueForge ${method} ${path} returned HTTP ${response.status ?? "unknown"}`,
  );
  try {
    return await response.json();
  } catch (cause) {
    throw new Error(`TrueForge ${method} ${path} returned invalid JSON`, { cause });
  }
}

function assertSavedSkillMatches(manifest, response) {
  invariant(
    isRecord(response) &&
      isDeepStrictEqual(response.data, { name: manifest.name, manifest }),
    `saved skill response mismatch for ${manifest.name}`,
  );
}

export async function syncSkills(
  manifests,
  {
    fetchImpl = globalThis.fetch,
    baseUrl = process.env.TRUEFORGE_BASE_URL ?? DEFAULT_TRUEFORGE_BASE_URL,
  } = {},
) {
  const summary = validateSkillManifests(manifests);
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);

  for (const manifest of manifests) {
    const response = await requestJson(fetchImpl, normalizedBaseUrl, SETTINGS_SKILLS_PATH, {
      method: "PUT",
      body: { manifest },
    });
    assertSavedSkillMatches(manifest, response);
  }

  const configured = await requestJson(fetchImpl, normalizedBaseUrl, SETTINGS_SKILLS_PATH);
  assertConfiguredSkillsMatch(manifests, configured);

  const available = await requestJson(fetchImpl, normalizedBaseUrl, AVAILABLE_SKILLS_PATH);
  assertAvailableSkillsMatch(manifests, available);

  return { baseUrl: normalizedBaseUrl, ...summary };
}

export async function runCli(
  args = process.argv.slice(2),
  {
    env = process.env,
    fetchImpl = globalThis.fetch,
    writeLine = (line) => console.log(line),
  } = {},
) {
  invariant(
    args.length === 1 && (args[0] === "--offline" || args[0] === "--live"),
    "usage: node scripts/trueforge-skills.mjs --offline|--live",
  );
  const manifests = await loadSkillManifests();

  if (args[0] === "--offline") {
    const summary = validateSkillManifests(manifests);
    writeLine(`OFFLINE_VALID ${JSON.stringify(summary)}`);
    return summary;
  }

  const result = await syncSkills(manifests, {
    fetchImpl,
    baseUrl: env.TRUEFORGE_BASE_URL ?? DEFAULT_TRUEFORGE_BASE_URL,
  });
  writeLine(`LIVE_SYNC_VALID ${JSON.stringify(result)}`);
  return result;
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : undefined;
if (invokedPath === import.meta.url) {
  runCli().catch((error) => {
    console.error(`TRUEFORGE_SKILLS_ERROR ${error.message}`);
    process.exitCode = 1;
  });
}
