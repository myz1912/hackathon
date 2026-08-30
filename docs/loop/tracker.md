# Loop Tracker: DaoHarness LinkedIn GTM

## Legend

- `[ ]` not started
- `[~]` in progress
- `[x]` complete with durable evidence
- `[!]` blocked
- `READY` predecessors satisfied; `GATED` predecessor evidence missing

## One-Hour DAG

The Codex Supervisor/root is controller-only. It creates, health-checks, and
monitors scoped project children; all implementation/research runs in children.

```text
TRUEFORGE_AGENT [READY_OFFLINE; LIVE_BLOCKED] ----\
                                                    > TRANSFER_AUDIT
VIDEO_RENDER_V1 [READY; USER APPROVED] -> RECORD_REPLAY_SKILL --/

TRUEFORGE_AGENT + VIDEO_RENDER_V1 + RECORD_REPLAY_SKILL + TRANSFER_AUDIT
                                                   -> QODO_SUBMISSION

EVENT_RESEARCH / MEDIA_INTAKE receipts remain incomplete.
VIRAL_RESEARCH remains deferred and is not a prerequisite for honest V1.
```

Only Post Director, Viral Trend Researcher, and Media Analyst are runtime agents.
Live synthesis/approval are root gates. Render is a HyperFrames tool; QA/package
are root steps. Record/Replay, transfer audit, and Qodo are delivery acceptance,
not runtime agents.

## Checkpoints

- [~] `EVENT_RESEARCH`: facts were obtained read-only; persist official sources,
  corrected goal/audience, and approved event asset ledger. Durable receipt is
  not yet accepted.
- [ ] `TRUEFORGE_AGENT`: implement and offline-validate only
  `trueforge/post-director.agent.json` and `scripts/trueforge-smoke.mjs`.
  Register the named root `post-director`; `dynamic_sub_agents` creates exactly
  Viral Trend Researcher and Media Analyst. Live create/smoke is model-blocked.
- [~] `MEDIA_INTAKE`: read-only collaboration obtained findings for all six
  originals; persist the out-of-Git manifest before accepting the checkpoint.
  Keep every original untracked/ignored and unchanged.
- [ ] `VIRAL_RESEARCH`: deferred. It may later test the hook/CTA, but V1 must not
  claim viral validation.
- [ ] `VIDEO_RENDER_V1`: user-approved to start with the exact frozen 30-second
  hook/value/positioning. Build in an isolated HyperFrames project, freeze/ledger
  BGM through `media-use`, render, and QA. If real UI capture is unavailable,
  use an explicitly labelled honest planned-flow visual; never fabricate a live
  TrueForge run.
- [ ] `RECORD_REPLAY_SKILL`: user records the runnable flow; package and replay
  the Codex skill with a receipt.
- [ ] `TRANSFER_AUDIT`: verify Codex replay and TrueForge-native manifest/tool/run
  contracts separately; `SKILL.md` is not native proof.
- [ ] `QODO_SUBMISSION`: initial review -> fix/justify -> follow-up review on
  corrected head -> evidence-backed submission.

## Readiness

| Work | State | Dependency / proof |
| --- | --- | --- |
| `TRUEFORGE_AGENT` | `READY_OFFLINE` / `LIVE_BLOCKED` | implement/validate the two-file production set; `GET /api/v1/models` returned `[]` and create returned 422 |
| `VIDEO_RENDER_V1` | `READY` / user-approved | exact frozen V1 brief, six source MOVs, official approved event cover; runs in parallel with TRUEFORGE_AGENT |
| `EVENT_RESEARCH` | `DEFERRED_TO_RECEIPT` / `[~]` | official-source receipt still incomplete; V1 may use only already approved official assets |
| `MEDIA_INTAKE` | `CONSUMED_AS_INPUT` / `[~]` | findings exist; six originals remain read-only/untracked; durable manifest still incomplete |
| `VIRAL_RESEARCH` | `DEFERRED` | no accepted evidence; not a V1 prerequisite and must not be claimed |
| `RECORD_REPLAY_SKILL` | `GATED` | runnable V1 video/flow + user actual recording |
| `TRANSFER_AUDIT` | `GATED` | TrueForge evidence + successful Codex replay |
| `QODO_SUBMISSION` | `GATED` | all prior deliverable evidence |

## Budget

| Window | Target |
| --- | --- |
| `T+00–10` | launch TRUEFORGE_AGENT and approved VIDEO_RENDER_V1 in parallel |
| `T+10–40` | offline TrueForge work; isolated HyperFrames build/render/QA with honest evidence labels |
| `T+40–50` | real Record & Replay capture and replay |
| `T+50–55` | transfer audit |
| `T+55–60` | Qodo/submission evidence or exact blocker packet |

At `T+60`, stop new work and report evidence honestly; never weaken a gate.

## Auto-Chain Rules

1. Supervisor implements nothing; each child owns one work item and explicit
   paths, preserves concurrent edits, updates loop state, and stops.
2. Workers create no grandchildren. Supervisor creates every `READY` item once,
   never a duplicate, and only after predecessor evidence exists.
3. Never auto-chain across missing credentials, human approval, destructive or
   external action, or unresolved product authority.
4. Revalidate all approval-bound digests before render/package.
5. Record & Replay requires the user's actual recording.
6. `transferable` requires independent passing evidence on both runtimes.

## Child Settings and Health

Daytime children explicitly use `model: gpt-5.6-sol`,
`reasoning_effort: high` (or `thinking: high`), and
`service_tier: priority` / FAST. Never use/inherit `ultra`, `max`, or `xhigh`.
At night (23:30–09:00 America/Los_Angeles), keep `high` but use standard tier
with FAST off. Apply the full provisional-ID health checklist in `handoff.md`.

## Current Next Action

`T0` is `2026-08-29 17:04 PDT`. Launch exactly two ready project threads in
parallel: `TRUEFORGE_AGENT` and user-approved `VIDEO_RENDER_V1`. Do not open an
EVENT_RESEARCH, MEDIA_INTAKE, VIRAL_RESEARCH, or RECORD_REPLAY_SKILL thread now.

## Evidence Log

| Item | Current truth |
| --- | --- |
| Loop bootstrap | `loop_doctor.py` returned `ok: true`; four local uncommitted loop files; no implementation/threads/commit |
| Event facts | obtained read-only; durable receipt not accepted; `[~]` |
| Viral patterns | not run; no accepted evidence |
| Product positioning | customer=event hoster; product=DaoHarness on top of TrueForge harness; outcome=raw event footage to usable/source-linked/approval-gated LinkedIn GTM video/package |
| Authority alignment | aligned across all four loop docs: 30s, product CTA, exact demo/value lines, hook hypothesis status, and provisional BGM gate; no conflicting old CTA/goal remains |
| Demo message | `TrueForge is the harness. DaoHarness ships the real business need.` |
| Value line | `DaoHarness turns what your business already has into what it needs to ship.` |
| Hook | user-selected V1 hook is `You already have the content. It just hasn’t become GTM yet.`; not viral-validated |
| CTA | product/business CTA: turn your event footage into GTM; event-attendance CTA is not primary |
| BGM | provisional `New Bass 01` by Lily J; remote source/license recorded in handoff; not frozen or accepted until VIDEO_RENDER runs `media-use` and writes ledger |
| VIDEO_RENDER V1 approval | user statement `剪吧，用Record and Replay弄下来` authorizes V1 build/render under the frozen brief; it does not prove viral performance, live TrueForge, publication, or outcome |
| V1 evidence boundary | no real UI capture may be replaced only by an explicitly labelled planned-flow visual; fake session/run evidence is prohibited |
| TRUEFORGE_AGENT thread | verified active `01a05019-622d-74f2-b3b6-9fb3d2c79a68`; title/worktree/first turn confirmed; requested model/effort but tier and runtime permission context unexposed |
| VIDEO_RENDER_V1 thread | verified active `01a05019-6232-78b3-b186-136f57215765`; title/worktree/first turn confirmed; requested model/effort but tier and runtime permission context unexposed |
| Media | read-only findings obtained for all six originals, including `IMG_4200.mov`; durable manifest not accepted; `[~]` |
| TrueForge runtime | v0.1.4; Bright Data connector authenticated with 74 tools; no connector code required |
| Agent production set | planned minimum is `trueforge/post-director.agent.json` + `scripts/trueforge-smoke.mjs`; both absent at this checkpoint |
| Live smoke contract | must witness exactly two `thread.created` events and a Bright Data MCP call; not accepted while model creation is blocked |
| Model blocker | `GET /api/v1/models` returned `[]`; create returned HTTP 422 |
| Child capabilities | dynamic children inherit root tools; per-child capability isolation is not proven, so enforced tool-level read-only isolation must not be claimed |
| `T0` | `2026-08-29 17:04 PDT` |
