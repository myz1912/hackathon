# Loop Tracker: DaoHarness LinkedIn GTM

## Legend

- `[ ]` not started
- `[~]` in progress
- `[x]` complete with durable evidence
- `[!]` blocked
- `READY` predecessors satisfied; `GATED` predecessor evidence missing

## Active DAG

Codex task `01a0505f-6100-7681-9331-e8456b0126d9` is the unique
Supervisor/controller. All other tasks finish only their already-started bounded
handoff or lane and must not create, direct, replace, or interrupt children.

```text
POSTFORGE_CUSTOM_UI [DISPOSED; RECOVERABLE TRASH]

VIDEO_REFINE_TWO_CUTS [ACTIVE; 01a0508c-4f8a-74f0-aeed-23625b10f134]

TRUEFORGE_CONTRACT_HARDEN [COMPLETE; f305a3f] -> TRUEFORGE_VERTICAL_SLICE [ACTIVE; 01a0508d-a7f9-7282-8e6d-587cec5689dc]
                                          + model configured [USER GATE]

TRUEFORGE_VERTICAL_SLICE -> native buttons -> approval -> restricted render -> playable/downloadable video
```

Only Post Director, Viral Trend Researcher, and Media Analyst are runtime agents.
Live synthesis/approval are root gates. Render is a HyperFrames tool; QA/package
are root steps. Record/Replay, transfer audit, and Qodo are delivery acceptance,
not runtime agents.

## Checkpoints

- [x] `POSTFORGE_CUSTOM_UI_DISPOSAL`: moved `demo/post-director` and the
  PostForge UI capture assets to macOS Trash. Do not restore or rebuild them.
- [~] `VIDEO_REFINE_TWO_CUTS`: active task
  `01a0508c-4f8a-74f0-aeed-23625b10f134`; refine the two existing HyperFrames projects in
  place; remove all TrueForge/PostForge content; replace trap/phonk with upbeat
  contemporary jazz; preserve rejected finals as comparison artifacts.
- [~] `TRUEFORGE_VERTICAL_SLICE`: active isolated-worktree task
  `01a0508d-a7f9-7282-8e6d-587cec5689dc`; use native TrueForge UI only. Sync skills,
  register DaoHarness, present large native outcome buttons, bind approval, call
  a restricted HyperFrames render bridge, then play/download the local result.

- [~] `EVENT_RESEARCH`: facts were obtained read-only; persist official sources,
  corrected goal/audience, and approved event asset ledger. Durable receipt is
  not yet accepted.
- [x] `TRUEFORGE_CONTRACT_HARDEN`: completed local scoped commit `f305a3f`
  (not pushed): six owned files, 43/43 tests, both offline validators, installed
  TrueForge v0.1.4 AgentSpecSchema, and response-schema conditionals passed. No
  live registration/session was attempted because the model registry was empty.
- [x] `TRUEFORGE_NATIVE_UI_AUDIT`: completed read-only. TrueForge 0.1.4 native
  OpenUI can express three-card structure, density differences, limited semantic
  variants, and native approval flow, but cannot implement exact Taoist
  Neo-Brutalism styling, card-level selected styling, arbitrary components, or
  host-chrome customization. No files changed and no successor was created.
- [!] `LIVE_UI`: gated. Do not create until contract hardening passes, the
  accepted audit limitation is preserved, and live
  `/api/v1/models` is non-empty. No live audience-style/design proof exists.
- [~] `MEDIA_INTAKE`: read-only collaboration obtained findings for all six
  originals; persist the out-of-Git manifest before accepting the checkpoint.
  Keep every original untracked/ignored and unchanged.
- [ ] `VIRAL_RESEARCH`: deferred. It may later test the hook/CTA, but V1 must not
  claim viral validation.
- [ ] `VIDEO_RENDER_V1`: no longer in the current ready set; preserve any
  separately owned artifact/evidence and do not conflate it with live TrueForge
  audience-style or native UI proof.
- [ ] `RECORD_REPLAY_SKILL`: user records the runnable flow; package and replay
  the Codex skill with a receipt.
- [ ] `TRANSFER_AUDIT`: verify Codex replay and TrueForge-native manifest/tool/run
  contracts separately; `SKILL.md` is not native proof.
- [ ] `QODO_SUBMISSION`: initial review -> fix/justify -> follow-up review on
  corrected head -> evidence-backed submission.

## Readiness

| Work | State | Dependency / proof |
| --- | --- | --- |
| `VIDEO_REFINE_TWO_CUTS` | `ACTIVE` | verified project-local task `01a0508c-4f8a-74f0-aeed-23625b10f134`; title/cwd/first turn and skill+loop reads confirmed; model/effort/tier/permission readback unverified |
| `TRUEFORGE_VERTICAL_SLICE` | `ACTIVE` | verified worktree task `01a0508d-a7f9-7282-8e6d-587cec5689dc`; title/cwd/first turn and loop/integration-risk reads confirmed; model/effort/tier/permission readback unverified; live model remains user gate |
| `TRUEFORGE_CONTRACT_HARDEN` | `COMPLETE_LOCAL` | commit `f305a3f`, 43/43 tests and named offline/schema validators; not pushed, no live proof |
| `TRUEFORGE_NATIVE_UI_AUDIT` | `COMPLETE` / read-only | task `01a05057-f717-72d1-8d16-d9bc8247eed7`; native approximation only, exact styling and host chrome unsupported; 28/28 snapshot tests, no live proof |
| `LIVE_UI` | `GATED` | contract lane final acceptance plus `/api/v1/models` non-empty; current count is 0 |
| `VIDEO_RENDER_V1` | `DEFERRED_SEPARATE_OWNER` | not current ready work; does not prove live TrueForge/UI behavior |
| `EVENT_RESEARCH` | `DEFERRED_TO_RECEIPT` / `[~]` | official-source receipt still incomplete; V1 may use only already approved official assets |
| `MEDIA_INTAKE` | `CONSUMED_AS_INPUT` / `[~]` | findings exist; six originals remain read-only/untracked; durable manifest still incomplete |
| `VIRAL_RESEARCH` | `DEFERRED` | no accepted evidence; not a V1 prerequisite and must not be claimed |
| `RECORD_REPLAY_SKILL` | `GATED` | runnable accepted flow + user actual recording |
| `TRANSFER_AUDIT` | `GATED` | TrueForge evidence + successful Codex replay |
| `QODO_SUBMISSION` | `GATED` | all prior deliverable evidence |

## Current Split-Run Budget

Neo explicitly reauthorized execution at `2026-08-29 19:40 PDT`. No new wall-
clock limit was stated. The new work is exactly the two ready lanes above; no
submission, publication, or unrelated hardening is authorized.

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

Unique Supervisor `01a0505f-6100-7681-9331-e8456b0126d9` creates and monitors
exactly two new sessions: video refinement immediately, and TrueForge vertical
slice after the current contract writer returns its handoff. The model registry
remains a user credential gate; every other non-secret step may proceed.

## Evidence Log

| Item | Current truth |
| --- | --- |
| Loop bootstrap | `docs/loop/**` is committed on the current branch; latest reconciliation `loop_doctor.py` returned `ok: true` before this edit |
| Event facts | obtained read-only; durable receipt not accepted; `[~]` |
| Viral patterns | not run; no accepted evidence |
| Product positioning | customer=event hoster; product=DaoHarness; Event GTM is one bounded capability built around a real business need; TrueForge is infrastructure only and is prohibited from both videos |
| Authority alignment | current two-video and native vertical-slice authority is committed at `c4f69e0`; no TrueForge/PostForge content is allowed in either video |
| Value line | `DaoHarness turns what your business already has into what it needs to ship.` |
| Hook | user-selected V1 hook is `You already have the content. It just hasn’t become GTM yet.`; not viral-validated |
| CTA | product/business CTA: turn your event footage into GTM; event-attendance CTA is not primary |
| BGM | Trapanomics/trap/phonk rejected; active video lane must resolve/freeze/ledger upbeat contemporary jazz and duck it under real voice |
| VIDEO_RENDER V1 approval | user statement `剪吧，用Record and Replay弄下来` authorizes V1 build/render under the frozen brief; it does not prove viral performance, live TrueForge, publication, or outcome |
| V1 evidence boundary | no real UI capture may be replaced only by an explicitly labelled planned-flow visual; fake session/run evidence is prohibited |
| Historical monolithic tasks | prior TRUEFORGE_AGENT/VIDEO_RENDER task IDs are not current ready lanes and must not be duplicated or mistaken for current live proof |
| Media | read-only findings obtained for all six originals, including `IMG_4200.mov`; durable manifest not accepted; `[~]` |
| TrueForge runtime | v0.1.4; Bright Data connector authenticated with 74 tools; no connector code required |
| Contract integration | six TrueForge contract/sync/smoke files committed locally at `f305a3f`; 43/43 tests and offline/schema gates passed; not pushed and not live |
| Live smoke contract | must witness exactly two `thread.created` events and a Bright Data MCP call; not accepted while model creation is blocked |
| Model blocker | `GET /api/v1/models` returned `[]`; create returned HTTP 422 |
| Child capabilities | dynamic children inherit root tools; per-child capability isolation is not proven, so enforced tool-level read-only isolation must not be claimed |
| Split authority | unique Supervisor owns two active tasks: video refinement and native TrueForge vertical slice; custom PostForge UI is disposed |
| Unique Supervisor | `01a0505f-6100-7681-9331-e8456b0126d9`; this reconciliation task relinquishes controller authority after the final handoff |
| TRUEFORGE_CONTRACT_HARDEN | active rework `01a05057-c59b-7882-834a-5ad475ba4ddd`; 39/39 pre-review tests, both offline validators, Node syntax, and installed v0.1.4 AgentSpecSchema passed, but independent review returned `not ready to commit`; it is reproducing only the negation-bypass, dynamic/read-only topology evidence, and approval-receipt-schema findings; no scoped commit or live run yet |
| TRUEFORGE_NATIVE_UI_AUDIT | completed read-only `01a05057-f717-72d1-8d16-d9bc8247eed7`; native OpenUI supports structure/density/limited semantic variants and native approval, not exact visual tokens, card-level selected styling, arbitrary components, or host chrome; no files changed and no successor created |
| Native design authority | canonical Taoist Neo-Brutalism source is `/Users/yz/DaoBrewStrategy/explorations/2026-08-18-neobrutal-design-system/report.html`; use only native component controls, no custom UI workaround |
| Current live model readback | `GET /api/v1/models` returned `count=0`; `LIVE_UI` remains credential-gated |
| Live proof boundary | no live audience-style run, selectable-direction UI, approval styling, or host-chrome customization has been accepted |
| Working tree | TrueForge integration files are uncommitted and owned by the single-writer hardening lane; source MOVs, `demo/**`, and `docs/plans/**` remain outside that lane |
| `T0` | `2026-08-29 17:04 PDT` |
| Fresh authorization | Neo said `go` at `2026-08-29 19:40 PDT`; two scoped lanes authorized, no new wall-clock limit stated |
