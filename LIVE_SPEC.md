# Spec — live Bright Data path + TrueForge agent registration

~35 minutes. Senior engineer. Write it, run what you can, leave it green. No plans.

**Credentials are NOT available yet.** They may arrive during this run. Everything must
work in three states, and say which state it is in: `live` (credentials present and the
call succeeded), `fallback` (no credentials, fixtures used), `error` (credentials present
but the call failed — report the real error, never silently fall back to fixtures and call
it live).

Existing: `src/tools/brightdata.ts`, `src/tools/policy.ts`, `src/agents/*`, `src/demo.ts`.
6 test files / 25 tests currently pass. Keep them passing.

---

## Part A — make the live Bright Data path real

`BrightDataCli` already exists but has never executed. Harden it for a real call.

1. **`src/tools/brightdata.ts`**
   - Read `BRIGHT_DATA_API_TOKEN` (fall back to `BRIGHTDATA_API_KEY`). Pass it to the CLI
     via `-k/--api-key` **or** rely on `brightdata login` state — do not print it, ever.
   - Command shape (verified, do not invent): `brightdata search <query> --json`.
     Confirm with `brightdata search --help` before relying on any flag; if `--json` is not
     supported, use what the help actually shows and note it in a comment.
   - Parse stdout as JSON. Map to `ResearchFinding[]`: every finding **must** have a real
     URL or it is dropped. Stamp `collectedAt` from the wall clock at fetch time.
   - Timeout (25s), non-zero exit, and unparseable-stdout each produce a distinct typed
     error carrying the exit code and a truncated stderr. **Never** swallow an error into a
     fixture result.
   - Add `sourceMode: "live" | "fixture"` to `ResearchReport` (extend the zod schema) so
     downstream code and the demo can state provenance honestly.

2. **`src/tools/research-receipt.ts`** — write a receipt after any live call:
   `artifacts/receipts/<iso>.json` containing query, sourceMode, per-finding
   `{url, publisher, collectedAt}`, the CLI exit code, and a duration. This is the
   Bright Data track's provenance evidence.

3. **`npm run research:live -- "<query>"`** — a small script that runs one real search and
   prints the receipt path plus a compact table. If credentials are missing it prints
   exactly what is missing and exits **1** (not 0).

4. Tests: parser drops URL-less findings · a non-zero CLI exit surfaces as an error and
   **not** as fixtures · receipt shape is validated · `sourceMode` is `fixture` when no
   credentials. Use an injected fake spawner; no network in tests.

---

## Part B — register a real TrueForge agent and capture a session trace

TrueForge v0.1.4 is serving at `http://localhost:8790` (**IPv6 — `127.0.0.1` will NOT
work**). Verified live routes:
```
GET  /api/v1/capabilities            → {"data":{"sandbox":{"enabled":true},...}}
GET  /api/v1/agents                  → {"data":[]}
GET  /api/v1/sessions                → {"data":[],...}
GET  /api/v1/settings/model-providers → {"data":[]}   ← none configured yet
GET  /api/v1/mcp-servers  ·  /api/v1/skills  ·  /api/v1/catalogs/*
```
**Discover the exact request bodies yourself** — `curl` the GET routes, read shapes, and if
a POST body is not derivable, say so rather than inventing fields. Do not guess a schema and
present it as working.

1. **`src/trueforge/client.ts`** — a small typed client: `capabilities()`, `listAgents()`,
   `createAgent(spec)`, `createSession(agentId)`, `listEvents(sessionId)`. Base URL from
   `TRUEFORGE_BASE_URL`, default `http://localhost:8790`. Short timeouts. Typed errors.
2. **`src/trueforge/register.ts`** + `npm run tf:register` — ensure the PostForge agent
   exists (idempotent: look it up by name first), print the agent id.
   If no model provider is configured, print exactly that and exit 1 with the remediation
   step. Do not pretend to have registered.
3. **`npm run tf:trace`** — create a session against the agent, run one turn, then pull
   `/api/v1/sessions/{id}/events` and write the raw events to
   `artifacts/trueforge-session-<id>.json`, printing a readable summary (turn count, tool
   calls, timings). This file is the harness-track evidence.
4. Tests against a **stubbed HTTP layer** (inject fetch): agent lookup is idempotent,
   a 4xx surfaces as a typed error, event pull maps correctly. No live calls in tests.

---

## Rules
- Never print, log, or commit a credential.
- `external_action: false` still holds — no posting, no uploads.
- Add `artifacts/` to `.gitignore` if not already there; **do** commit a redacted sample
  receipt at `docs/evidence/sample-research-receipt.json` so the shape is reviewable.
- Do not weaken an existing test.

## Run and report real output
```bash
npx tsc --noEmit
npx vitest run
npm run tf:register        # expected to exit 1 until a model provider exists — that is fine, report it
npm run research:live -- "short form video hooks"   # expected to exit 1 without credentials
```
Report exactly what each did, including the failures. Failing correctly with a clear
message is the deliverable when credentials are absent.
