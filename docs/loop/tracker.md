# Loop Tracker: LinkedIn GTM Agent

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
EVENT_RESEARCH [~] --\
                       > VIRAL_RESEARCH -------------------\
TRUEFORGE_AGENT ------/                                    \
                                                             > live root synthesis
TRUEFORGE_AGENT -----------------------\                    /  + human approval
MEDIA_INTAKE ---------------------------> Media Analyst ----/
                                                                    |
                                                                    v
                                                               VIDEO_RENDER
                                                                    |
                                                                    v
                                                         RECORD_REPLAY_SKILL

TRUEFORGE_AGENT + RECORD_REPLAY_SKILL -> TRANSFER_AUDIT
EVENT_RESEARCH + VIRAL_RESEARCH + VIDEO_RENDER + TRANSFER_AUDIT
                                             -> QODO_SUBMISSION
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
- [ ] `VIRAL_RESEARCH`: after event receipt and agent registration, run Viral
  Trend Researcher and accept source-linked LinkedIn evidence. Validate or
  reject the brainstormed hook direction; do not treat it as viral evidence.
- [ ] `VIDEO_RENDER`: after both research receipts, Media Analyst, live root
  synthesis, and human approval, run HyperFrames -> QA -> package-only output.
- [ ] `RECORD_REPLAY_SKILL`: user records the runnable flow; package and replay
  the Codex skill with a receipt.
- [ ] `TRANSFER_AUDIT`: verify Codex replay and TrueForge-native manifest/tool/run
  contracts separately; `SKILL.md` is not native proof.
- [ ] `QODO_SUBMISSION`: initial review -> fix/justify -> follow-up review on
  corrected head -> evidence-backed submission.

## Readiness

| Work | State | Dependency / proof |
| --- | --- | --- |
| `EVENT_RESEARCH` | `READY` / `[~]` | official-source receipt still needed |
| `TRUEFORGE_AGENT` | `READY_OFFLINE` / `LIVE_BLOCKED` | implement/validate the two-file production set; `GET /api/v1/models` returned `[]` and create returned 422 |
| `MEDIA_INTAKE` | `READY_TO_PERSIST` / `[~]` | read-only findings exist for six untracked originals, including `IMG_4200.mov`; no durable accepted manifest |
| `VIRAL_RESEARCH` | `GATED` | durable event receipt + registered agent + non-empty model registry; live-through-TrueForge is model-blocked |
| `VIDEO_RENDER` | `GATED` | all research/media/runtime evidence + exact approval |
| `RECORD_REPLAY_SKILL` | `GATED` | runnable `VIDEO_RENDER` flow + user recording |
| `TRANSFER_AUDIT` | `GATED` | TrueForge evidence + successful Codex replay |
| `QODO_SUBMISSION` | `GATED` | all prior deliverable evidence |

## Budget

| Window | Target |
| --- | --- |
| `T+00–10` | event receipt + agent registration + media intake in parallel |
| `T+10–22` | viral research + Media Analyst + root synthesis + approval |
| `T+22–40` | HyperFrames render + root QA/package + human visual check |
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

`T0` is `2026-08-29 17:04 PDT`. Persist `EVENT_RESEARCH` and `MEDIA_INTAKE` while
implementing/offline-validating the two-file `TRUEFORGE_AGENT` production set.
Do not claim or run accepted live viral research until the model registry is
non-empty and create succeeds.

## Evidence Log

| Item | Current truth |
| --- | --- |
| Loop bootstrap | `loop_doctor.py` returned `ok: true`; four local uncommitted loop files; no implementation/threads/commit |
| Event facts | obtained read-only; durable receipt not accepted; `[~]` |
| Viral patterns | not run; no accepted evidence |
| Hook | brainstorm only; recommended direction is Authentic FOMO spoken hook + category/product middle; not viral-validated; final hook pending user selection |
| Media | read-only findings obtained for all six originals, including `IMG_4200.mov`; durable manifest not accepted; `[~]` |
| TrueForge runtime | v0.1.4; Bright Data connector authenticated with 74 tools; no connector code required |
| Agent production set | planned minimum is `trueforge/post-director.agent.json` + `scripts/trueforge-smoke.mjs`; both absent at this checkpoint |
| Live smoke contract | must witness exactly two `thread.created` events and a Bright Data MCP call; not accepted while model creation is blocked |
| Model blocker | `GET /api/v1/models` returned `[]`; create returned HTTP 422 |
| Child capabilities | dynamic children inherit root tools; per-child capability isolation is not proven, so enforced tool-level read-only isolation must not be claimed |
| `T0` | `2026-08-29 17:04 PDT` |
