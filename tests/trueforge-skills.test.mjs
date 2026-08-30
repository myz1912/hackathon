import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  DEFAULT_TRUEFORGE_BASE_URL,
  assertAvailableSkillsMatch,
  assertConfiguredSkillsMatch,
  loadSkillManifests,
  normalizeBaseUrl,
  syncSkills,
  validateSkillManifests,
} from "../scripts/trueforge-skills.mjs";

const EXPECTED_NAMES = [
  "daobrew-video",
  "hyperframes",
  "hyperframes-core",
  "hyperframes-cli",
  "general-video",
  "media-use",
  "hyperframes-audio",
];

const DAOBREW_REF = "492756d6d204887f1da271c4cab4df5cbcc83717";
const HYPERFRAMES_REF = "0fd70b1d2165d6ac9f4199bfafa9f22c711bfc8f";

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function createSkillApi({ mutateConfigured, mutateAvailable } = {}) {
  const calls = [];
  const registry = new Map();

  const fetchImpl = async (input, init = {}) => {
    const url = new URL(input);
    const method = (init.method ?? "GET").toUpperCase();
    const body = init.body === undefined ? undefined : JSON.parse(init.body);
    calls.push({ url: url.href, path: url.pathname, method, headers: init.headers, body });

    if (method === "PUT" && url.pathname === "/api/v1/settings/skills") {
      registry.set(body.manifest.name, structuredClone(body.manifest));
      return response({
        data: {
          name: body.manifest.name,
          manifest: structuredClone(body.manifest),
        },
      });
    }

    if (method === "GET" && url.pathname === "/api/v1/settings/skills") {
      let data = [...registry.values()].map((manifest) => ({
        name: manifest.name,
        manifest: structuredClone(manifest),
      }));
      if (mutateConfigured) data = mutateConfigured(data);
      return response({ data });
    }

    if (method === "GET" && url.pathname === "/api/v1/skills") {
      let data = [...registry.values()].map(({ name, description }) => ({
        name,
        description,
      }));
      if (mutateAvailable) data = mutateAvailable(data);
      return response({ data });
    }

    return response({ error: "unexpected test endpoint" }, 404);
  };

  return { calls, fetchImpl, registry };
}

test("production manifest declares exactly the required pinned Git skills", async () => {
  const manifests = await loadSkillManifests();
  const summary = validateSkillManifests(manifests);

  assert.deepEqual(summary.names, EXPECTED_NAMES);
  assert.equal(summary.count, EXPECTED_NAMES.length);
  assert.deepEqual(
    JSON.parse(
      await readFile(new URL("../trueforge/skills.json", import.meta.url), "utf8"),
    ),
    manifests,
  );

  for (const manifest of manifests) {
    assert.equal(manifest.type, "git");
    assert.match(manifest.url, /^https:\/\/github\.com\//);
    assert.match(manifest.ref, /^[0-9a-f]{40}$/);
    assert.match(manifest.path, /^[A-Za-z0-9._/-]+$/);
    assert.ok(manifest.description.length > 0);
  }
});

test("production manifest points to the verified current published repositories and paths", async () => {
  const manifests = await loadSkillManifests();
  const byName = new Map(manifests.map((manifest) => [manifest.name, manifest]));

  assert.deepEqual(byName.get("daobrew-video"), {
    type: "git",
    name: "daobrew-video",
    url: "https://github.com/DaoBrewAI/building-in-public",
    path: "daobrew-video/skills/daobrew-video",
    ref: DAOBREW_REF,
    description: byName.get("daobrew-video").description,
  });

  for (const name of EXPECTED_NAMES.slice(1)) {
    assert.equal(byName.get(name).url, "https://github.com/heygen-com/hyperframes");
    assert.equal(byName.get(name).path, `skills/${name}`);
    assert.equal(byName.get(name).ref, HYPERFRAMES_REF);
  }
});

test("validator and live sync reject syntactically valid untrusted source mappings", async () => {
  const manifests = await loadSkillManifests();

  for (const manifest of manifests) {
    const untrustedRepository = structuredClone(manifests);
    untrustedRepository.find(({ name }) => name === manifest.name).url =
      "https://github.com/example/repository";
    assert.throws(
      () => validateSkillManifests(untrustedRepository),
      new RegExp(`trusted source mapping mismatch for ${manifest.name}: url`),
    );
  }

  const untrustedPath = structuredClone(manifests);
  untrustedPath.find(({ name }) => name === "hyperframes-core").path =
    "skills/hyperframes";
  assert.throws(
    () => validateSkillManifests(untrustedPath),
    /trusted source mapping mismatch for hyperframes-core: path/,
  );

  const untrustedRef = structuredClone(manifests);
  untrustedRef.find(({ name }) => name === "media-use").ref = "f".repeat(40);
  assert.throws(
    () => validateSkillManifests(untrustedRef),
    /trusted source mapping mismatch for media-use: ref/,
  );

  const api = createSkillApi();
  await assert.rejects(
    syncSkills(untrustedPath, { fetchImpl: api.fetchImpl }),
    /trusted source mapping mismatch for hyperframes-core: path/,
  );
  assert.equal(api.calls.length, 0);
});

test("validation rejects moving refs, duplicate names, unsafe paths, and extra fields", async () => {
  const base = await loadSkillManifests();

  const movingRef = structuredClone(base);
  movingRef[0].ref = "main";
  assert.throws(() => validateSkillManifests(movingRef), /40-character commit SHA/);

  const duplicate = structuredClone(base);
  duplicate[1].name = duplicate[0].name;
  assert.throws(() => validateSkillManifests(duplicate), /unique/);

  const unsafePath = structuredClone(base);
  unsafePath[0].path = "../secrets";
  assert.throws(() => validateSkillManifests(unsafePath), /path/);

  const secretField = structuredClone(base);
  secretField[0].token = "must-not-be-accepted";
  assert.throws(() => validateSkillManifests(secretField), /unsupported field/);
});

test("read-back preserves unrelated user skills while matching our exact relevant projections", async () => {
  const manifests = await loadSkillManifests();
  const configured = {
    data: [
      { name: "unrelated", manifest: { name: "unrelated" } },
      ...manifests.map((manifest) => ({ name: manifest.name, manifest })),
    ],
  };
  const available = {
    data: [
      { name: "unrelated", description: "preserved" },
      ...manifests.map(({ name, description }) => ({ name, description })),
    ],
  };

  assert.equal(assertConfiguredSkillsMatch(manifests, configured), true);
  assert.equal(assertAvailableSkillsMatch(manifests, available), true);
});

test("read-back helpers fail closed on any relevant manifest or description mismatch", async () => {
  const manifests = await loadSkillManifests();
  const configured = {
    data: manifests.map((manifest) => ({ name: manifest.name, manifest: structuredClone(manifest) })),
  };
  configured.data[0].manifest.ref = "f".repeat(40);
  assert.throws(
    () => assertConfiguredSkillsMatch(manifests, configured),
    /configured skill read-back mismatch.*daobrew-video/,
  );

  const available = {
    data: manifests.map(({ name, description }) => ({ name, description })),
  };
  available.data[0].description = "server changed this description";
  assert.throws(
    () => assertAvailableSkillsMatch(manifests, available),
    /available skill read-back mismatch.*daobrew-video/,
  );
});

test("live sync uses the OpenAPI PUT contract and both documented read-back projections", async () => {
  const manifests = await loadSkillManifests();
  const api = createSkillApi();

  const result = await syncSkills(manifests, { fetchImpl: api.fetchImpl });

  assert.equal(DEFAULT_TRUEFORGE_BASE_URL, "http://127.0.0.1:8790");
  assert.deepEqual(result, {
    baseUrl: DEFAULT_TRUEFORGE_BASE_URL,
    count: EXPECTED_NAMES.length,
    names: EXPECTED_NAMES,
  });
  assert.equal(api.calls.length, EXPECTED_NAMES.length + 2);
  assert.deepEqual(
    api.calls.slice(0, EXPECTED_NAMES.length).map(({ method, path }) => ({ method, path })),
    EXPECTED_NAMES.map(() => ({ method: "PUT", path: "/api/v1/settings/skills" })),
  );
  for (const call of api.calls.slice(0, EXPECTED_NAMES.length)) {
    assert.deepEqual(Object.keys(call.body), ["manifest"]);
    assert.equal(call.headers["content-type"], "application/json");
    assert.equal(call.url.startsWith(`${DEFAULT_TRUEFORGE_BASE_URL}/`), true);
  }
  assert.deepEqual(
    api.calls.slice(-2).map(({ method, path }) => ({ method, path })),
    [
      { method: "GET", path: "/api/v1/settings/skills" },
      { method: "GET", path: "/api/v1/skills" },
    ],
  );
  assert.doesNotMatch(JSON.stringify(api.calls), /authorization|cookie|password|secret|token/i);
});

test("live sync is idempotent", async () => {
  const manifests = await loadSkillManifests();
  const api = createSkillApi();

  const first = await syncSkills(manifests, { fetchImpl: api.fetchImpl });
  const second = await syncSkills(manifests, { fetchImpl: api.fetchImpl });

  assert.deepEqual(second, first);
  assert.equal(api.registry.size, EXPECTED_NAMES.length);
  assert.deepEqual([...api.registry.values()], manifests);
});

test("live sync fails closed when full settings read-back differs", async () => {
  const manifests = await loadSkillManifests();
  const api = createSkillApi({
    mutateConfigured(data) {
      const changed = structuredClone(data);
      changed[0].manifest.path = "skills/wrong-path";
      return changed;
    },
  });

  await assert.rejects(
    syncSkills(manifests, { fetchImpl: api.fetchImpl }),
    /configured skill read-back mismatch/,
  );
  assert.equal(api.calls.at(-1).path, "/api/v1/settings/skills");
});

test("live sync fails closed when composer read-back differs", async () => {
  const manifests = await loadSkillManifests();
  const api = createSkillApi({
    mutateAvailable(data) {
      return data.filter(({ name }) => name !== "media-use");
    },
  });

  await assert.rejects(
    syncSkills(manifests, { fetchImpl: api.fetchImpl }),
    /available skill read-back mismatch.*media-use/,
  );
  assert.equal(api.calls.at(-1).path, "/api/v1/skills");
});

test("base URL validation excludes embedded credentials and non-origin paths", () => {
  assert.equal(normalizeBaseUrl("http://127.0.0.1:8790/"), DEFAULT_TRUEFORGE_BASE_URL);
  assert.throws(() => normalizeBaseUrl("http://user:secret@127.0.0.1:8790"), /credentials/);
  assert.throws(() => normalizeBaseUrl("http://127.0.0.1:8790/arbitrary"), /origin only/);
  assert.throws(() => normalizeBaseUrl("file:///tmp/trueforge"), /HTTP/);
});
