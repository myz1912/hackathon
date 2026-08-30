# DaoBrew PostForge

A TrueForge-native multi-agent workflow that turns a goal, audience, platform, and owned
media into a researched, source-cited, QA-verified, copy-ready social post package.

Built 29 August 2026 for the TrueForge Agent Harness Hackathon.

> **Truth boundary.** `package-ready` is not `published`. The pipeline stops at a verified
> packet with `external_action: false`. Direct posting would require a separate
> exact-action approval and a platform connector, and neither exists here.

## Run it

```bash
npm install
npm run verify                 # typecheck + 25 tests, no network, no credentials
npm run demo -- --approve      # full run, writes a packet
npm run demo -- --deny         # denial path: nothing is written
npm run demo -- --tamper       # approve a plan, mutate it, watch the gate refuse
```

Node ≥ 22. Tests and the demo run entirely offline against fixtures.

## What it does

```
brief + owned media
        │
        ▼
  Post Director  ──┬── Trend Researcher  → Bright Data (read-only, allowlisted)
                   └── Media Analyst     → ffprobe (fixed argv, confined paths)
        │                    ↑ these two run in parallel
        ▼
  source-cited edit plan
        │
        ▼
  human approval  ── bound to a SHA-256 digest of the exact plan
        │
        ▼
  QA → publish packet  (external_action: false)
```

## The write gate

Every write announces its exact tool and argv before running, and the approval is bound to
a **digest of the plan the human actually saw**. `renderPackage` recomputes that digest
immediately before writing and refuses on any difference. There is no bypass flag.

`npm run demo -- --tamper` approves a plan, mutates one timecode, and attempts the render:

```
16  approval_requested  planDigest 19fbb510…  digest 21a21134…
17  approval_decided    approved=true         approvedDigest 21a21134…
18  approval_mismatch   approved 21a21134…    current f9e4c18a…
```

Measured in isolation with `artifacts/` removed first: **tamper writes 0 files, approve
writes exactly 1.** Approving one action does not authorize the next.

## Guarantees, and how each is enforced

| Guarantee | Mechanism |
|---|---|
| No fabricated sources | Findings arriving without a URL are dropped, never invented. Every edit-plan segment must cite a real finding URL or validation fails. |
| Read-only research | Frozen tool-id allowlist, **deny by default**, enforced before any process spawn (`src/tools/policy.ts`). |
| Media stays confined | `resolveWithinRoot` resolves the media root via `realpath` and rejects traversal, absolute outside paths, symlink escapes, and sibling-prefix collisions (`/media-evil` ≠ `/media`). |
| Approval means what it says | Plan digest binding, above (`src/digest.ts`). |
| Parallelism is provable | Per-subagent spans in an append-only trace, not an assertion in prose. |
| No shell injection | Every external process gets a fixed argv array; never a shell string. |

## Verification

Clean install from `package.json`, `node_modules` and lockfile removed first:

```
npm install         0 vulnerabilities
npx tsc --noEmit    exit 0
npx vitest run      6 files, 25 tests passed
```

## Honest limits

- **Live Bright Data and real media probing are not exercised.** Verified runs use offline
  fixtures, and the demo prints that rather than implying live data.
- TrueForge agent registration and a live session trace are **not** in this repo yet.
  TrueForge v0.1.4 runs locally and its API was probed, but the pipeline does not yet
  execute as a registered TrueForge agent.
- HyperFrames rendering (P5) is not implemented.
- `docs/status.html` claims derivation by a `status-provenance.mjs` that does not exist,
  and its outputs disagree with `docs/status-derived.json`. Open — see Qodo finding 4 below.

Nothing in this README describes a capability that has not been run. Where something is
unbuilt, it is listed above.

## Setup note

TrueForge binds **IPv6 localhost** in standalone mode. `http://127.0.0.1:8790` does not
reach it; use `http://localhost:8790`. Verified 2026-08-29: `curl 127.0.0.1:8790` fails,
`curl localhost:8790` returns `200`.

## Team

- **Murad** — competition integrations: TrueForge, Bright Data, Qodo, qualification evidence
- **Neo** — video: DaoBrew direction, source approval, HyperFrames output, visual acceptance
- **Annabel** — multi-agent framework: agent boundaries, orchestration, contracts, failure handling

## Reused dependencies (disclosed)

`daobrew-video` (house style, source-fidelity rules, QA checklist) and HyperFrames existed
before the hackathon and are not presented as hackathon-original work. AI coding assistance
was used and is disclosed.

## Qodo Code Review Evidence

Both pull requests were reviewed by Qodo's agentic review before merge.

### [PR #2](https://github.com/myz1912/hackathon/pull/2) — three High security findings, all fixed

Qodo reviewed [PR #1](https://github.com/myz1912/hackathon/pull/1) and returned four
findings. The three High ones were security defects in the code and were fixed in PR #2.

**Finding 2 · High — "Approval does not bind render."** The sharpest one, and correct.

> "The workflow approves an edit plan but never binds that approval to an immutable plan
> digest and exact render arguments, so the plan or source/timecode parameters can change
> after approval while the render still appears authorized. This defeats the stated
> fail-closed human write gate."

The gate printed exact argv but nothing tied the approval to the *plan*. A timecode could
change between approval and render while the invocation still looked authorized — it
appeared fail-closed and was not. *Fixed* with order-independent canonicalization plus
SHA-256 digest binding, recomputed before every write, with `--tamper` added so the refusal
is demonstrable rather than asserted.

**Finding 1 · High — "Media paths escape confinement."** The contract accepted arbitrary
local paths with no allowed root, canonicalization, or symlink rule. *Fixed* in
`src/safepath.ts`, including the sibling-prefix case a naive string compare misses.

**Finding 3 · High — "Read-only connector is unenforced."** Read-only was policy prose
rather than runtime enforcement. *Fixed* with a frozen tool-id allowlist that denies by
default, before any spawn.

**Finding 4 · Medium — "Status derivation is unreproducible."** Not yet addressed; listed
under Honest limits above.

Test count went from 12 to 25 across the fixes. No existing test was weakened to make a new
one pass.
