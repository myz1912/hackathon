# Loop Handoff: DaoHarness LinkedIn GTM

## Current State

- Repo/branch/base head: `/Users/yz/hackathon` /
  `codex/trueforge-content-agent` / `01466f8`.
- Base loop is committed; this positioning update is local pending the requested
  four-file control-doc commit.
- Verification: `loop_doctor.py --loop-dir docs/loop --json` returned `ok: true`;
  all six MOV inputs were verified untracked; no template/bad-URL markers found.
- No implementation, runtime thread, commit, render, QA, replay, Qodo review, or
  external action is claimed by this bootstrap.
- `EVENT_RESEARCH=[~]`: read-only collaboration obtained facts, but no durable
  accepted repository receipt exists.
- `VIRAL_RESEARCH=[ ]`: not run; no accepted evidence.
- `MEDIA_INTAKE=[~]`: read-only collaboration obtained findings for all six
  user-original inputs, including `IMG_4200.mov`, but no durable accepted
  manifest exists. Every MOV remains untracked.
- `T0=2026-08-29 17:04 PDT`.
- Output remains `package_only`, `external_action: false`.

## Frozen Inputs

```yaml
customer: event_hoster
product: daoharness_on_top_of_trueforge_harness
business_outcome: turn_accumulated_raw_event_footage_into_usable_source_linked_approval_gated_linkedin_gtm_video_and_package
event_url: https://luma.com/agent-harness?tk=vhwtdV
platform: linkedin
duration_seconds: 30
language: English
renderer: hyperframes_only
edit_permissions: all_edit_techniques_permitted
event_brand: source_approved_official_assets_only
cta: turn_your_event_footage_into_gtm
publishing_mode: package_only
external_action: false
demo_message: "TrueForge is the harness. DaoHarness ships the real business need."
value_line: "DaoHarness turns raw event footage into usable GTM video—on top of TrueForge."
audience: event_hosters_and_teams_with_accumulated_raw_footage
hook:
  primary_hypothesis: "Your event already has the content. It’s just trapped in the camera roll."
  status: not_viral_validated_final_selection_pending_user
bgm:
  selection: "New Bass 01 by Lily J"
  source: https://assets.mixkit.co/music/720/720.mp3
  license: https://mixkit.co/license/#musicFree
  status: provisional_not_downloaded_not_frozen_not_ledgered
media_paths:
  - /Users/yz/hackathon/IMG_4190.mov
  - /Users/yz/hackathon/IMG_4192.mov
  - /Users/yz/hackathon/IMG_4196.mov
  - /Users/yz/hackathon/IMG_4198.mov
  - /Users/yz/hackathon/IMG_4199.mov
  - /Users/yz/hackathon/IMG_4200.mov
```

Every MOV must remain untracked/ignored and must never be staged, committed,
moved, renamed, modified, transcoded in place, or overwritten. Media analysis
and final rendering may only read the originals.

## Official Event Readback Inputs

- `https://luma.com/agent-harness`
- `https://www.wemakedevs.org/hackathons/trueforge`
- `https://www.wemakedevs.org/hackathons/trueforge/rules`
- `https://www.wemakedevs.org/blogs/agent-harness-hackathon-kick-off`

If a URL is 404, follow the official guide's actual link and record that exact
URL. Never guess or silently invent a replacement.

Luma remains the authority for event facts and source-approved event assets. It
does not set the primary CTA; the CTA is to turn event footage into GTM.

## Fixed Runtime

Exactly three agents: root `Post Director`, read-only dynamic `Viral Trend
Researcher`, read-only dynamic `Media Analyst`. HyperFrames is a deterministic
tool. Technical QA and package writing are root steps. No other runtime agent.

Verified TrueForge facts and current boundary:

- Runtime is TrueForge v0.1.4.
- The existing `bright-data` connector is authenticated and exposes 74 tools;
  no connector code is required for this MVP.
- Register only the named root `post-director`. Its `dynamic_sub_agents` must
  create exactly Viral Trend Researcher and Media Analyst.
- Minimal production set is exactly `trueforge/post-director.agent.json` plus
  `scripts/trueforge-smoke.mjs`; neither file exists at this checkpoint.
- Real API smoke acceptance must witness exactly two `thread.created` events and
  a Bright Data MCP call.
- Hard blocker: `GET /api/v1/models` returned `[]`; agent/session create returned
  HTTP 422. Therefore the real API smoke is not yet accepted.
- Dynamic children inherit root tools. Per-child capability isolation is not
  proven; do not claim enforced tool-level read-only isolation from role names
  or prompts alone.

## Ready Set and Blockers

Ready now: persist `EVENT_RESEARCH`; persist `MEDIA_INTAKE`; implement and
offline-validate the two-file `TRUEFORGE_AGENT` production set.

Gated: `VIRAL_RESEARCH`, `VIDEO_RENDER`, `RECORD_REPLAY_SKILL`,
`TRANSFER_AUDIT`, `QODO_SUBMISSION` per `tracker.md`.

Current blockers/unverified state:

- live TrueForge creation is hard-blocked because the model registry is empty
  and create returns 422; never expose secret values while resolving it;
- official event facts need a durable receipt and goal/audience correction;
- all six media findings need a durable out-of-Git intake manifest;
- viral research, approval, render, replay, transfer, and Qodo evidence do not
  yet exist.
- primary hook hypothesis is not viral-validated; final hook remains a user
  selection after research.
- provisional BGM has not been downloaded, frozen, license-read-backed, or
  ledgered. Only VIDEO_RENDER may do that through `media-use`.

## Exact Next Prompts

Supervisor uses recorded `T0=2026-08-29 17:04 PDT`, creates the following ready
project children as concurrency permits, health-checks them, and implements
nothing itself.

### EVENT_RESEARCH

```text
Use $codex-loop-engineering in /Users/yz/hackathon. Read all four docs/loop files.
Own only EVENT_RESEARCH and preserve concurrent work. Read the official URLs in
handoff.md; persist facts, source/readback times, corrected goal/audience, and
source-approved official event asset references. If 404, follow and record the
official guide's actual link; never guess. Do not perform viral research,
download media, replace the product CTA with an event-attendance CTA, implement
runtime code, or act externally. DaoHarness product authority remains the frozen loop
brief. Update tracker and handoff with evidence, then stop; create no successor.
```

### TRUEFORGE_AGENT

```text
Use $codex-loop-engineering in /Users/yz/hackathon. Read all four docs/loop files
and project context. Own only TRUEFORGE_AGENT and preserve concurrent work.
The product is DaoHarness on top of the TrueForge harness; the business outcome
is raw event footage to a source-linked, approval-gated LinkedIn GTM package.
Reread provider/model state without exposing secrets. Implement only
trueforge/post-director.agent.json and scripts/trueforge-smoke.mjs. Register the
named root post-director; dynamic_sub_agents creates exactly Viral Trend
Researcher and Media Analyst. Reuse the authenticated 74-tool bright-data
connector; write no connector code. Offline-validate while GET /api/v1/models is
empty and create returns 422. The real smoke is accepted only after it witnesses
exactly two thread.created events and a Bright Data MCP call. Dynamic children
inherit root tools, so per-child capability isolation is unproven and must not be
claimed. HyperFrames is a deterministic tool; QA/package are root steps. Test
fail-closed approval and package_only/external_action false. No arbitrary shell,
DaoBrew/DoubleVideo style, DaoBrew outro, pre-approval render, LinkedIn action,
or transfer claim from SKILL.md. Record evidence/blocker, update loop files, and
stop; create no successor.
```

### MEDIA_INTAKE

```text
Use $codex-loop-engineering in /Users/yz/hackathon. Read all four docs/loop files.
Own only MEDIA_INTAKE and preserve concurrent work. Read-only collaboration has
already obtained findings for the six confirmed MOV paths, but no durable
manifest exists. Persist an ignored/out-of-Git manifest with ownership, hashes,
metadata, findings, and timecodes that identify footage usable for the frozen
event-hoster GTM outcome. Every original, including
IMG_4200.mov, must stay untracked/ignored and never be staged, committed, moved,
renamed, modified, transcoded in place, or overwritten. Do not render or work
another lane. Update loop files with evidence, then stop; create no successor.
```

### VIRAL_RESEARCH (gated)

```text
Use $codex-loop-engineering in /Users/yz/hackathon. Read all four docs/loop files.
Own only VIRAL_RESEARCH. Research current source-linked LinkedIn patterns for the
event-hoster business outcome. Validate or reject this hook hypothesis: “Your
event already has the content. It’s just trapped in the camera roll.” Evaluate
the product CTA “turn your event footage into GTM,” not event attendance as the
primary CTA. Preserve uncertainty and direct URLs. No accepted viral claim,
download, render, external action, or successor creation without evidence.
```

### VIDEO_RENDER (gated)

```text
Use $codex-loop-engineering, $hyperframes, and $media-use in /Users/yz/hackathon.
Read all four docs/loop files. Own only VIDEO_RENDER. Use the user-selected final
hook, the exact demo message “TrueForge is the harness. DaoHarness ships the real
business need.”, the value line “DaoHarness turns raw event footage into usable
GTM video—on top of TrueForge.”, and the product CTA “turn your event footage
into GTM.” Render 30 seconds with HyperFrames-only after digest-bound approval.
The BGM “New Bass 01” by Lily J is provisional: first use media-use resolve with
`--type bgm --from https://assets.mixkit.co/music/720/720.mp3`, freeze it to a
local ignored `.media` asset, verify/read back
`https://mixkit.co/license/#musicFree`, and record source/license/provenance in
the media ledger. Never let root download it or reference the remote URL directly
in the composition. Stop if freeze, ledger, license readback, approval, or QA
fails. No LinkedIn action or successor creation.
```

## Auto-Chain and Thread Health

`auto_chain_next_session: true`

- Only Supervisor creates each `READY` lane once; workers create no
  grandchildren. Never cross a human/credential/external/destructive gate.
- Daytime creation explicitly requests `gpt-5.6-sol`, `high`, and
  `priority`/FAST; never installer-template `ultra`. Night uses `high`, standard
  tier, FAST off.
- A returned ID is provisional until: it targets the saved project; list/read
  finds it; title matches one lane; first turn is active/normal; the child read
  loop files and acknowledged ownership/concurrency; exposed model/effort/tier
  match. Record unobservable settings as unverified.
- For no-approval launches, real `turn_context`—not config text—must show
  `approval_policy=never` and `sandbox_policy.type=danger-full-access`.
- On failure, mark stale/archive if possible and create at most one replacement.

## Transfer Verdict

- `transferable`: Codex skill installs/replays and TrueForge manifest/tools
  register/run with the exact three-agent trace and equivalent approvals/output.
- `transferable_with_adapter`: both run but a named adapter is required.
- `codex_only`, `trueforge_only`, or `not_proven`: evidence is one-sided or
  incomplete. A `SKILL.md` alone is never `transferable`.

## Bootstrap Command

```bash
PROJECT_NAME="DaoHarness LinkedIn GTM" LOOP_DIR="docs/loop" AUTO_CHAIN=true \
  bash /Users/yz/.codex/skills/codex-loop-engineering/install.sh
```
