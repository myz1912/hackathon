# Goal: DaoHarness LinkedIn GTM — One-Hour MVP

## Objective

Build DaoHarness on top of the TrueForge harness for the event hoster. The
business outcome is to turn accumulated raw event footage into a usable,
source-linked, approval-gated 30-second English LinkedIn GTM video and copy-ready
package. Rendering is HyperFrames-only and no LinkedIn action occurs.

Control authority: Codex task `01a0505f-6100-7681-9331-e8456b0126d9` is the
unique Supervisor. Other tasks may finish an already-started bounded handoff but
must not create, direct, replace, or interrupt execution lanes.

Capture the runnable workflow with Record & Replay as a Codex skill, then audit
that skill separately against TrueForge-native manifest/tool/run evidence. A
`SKILL.md` alone never proves TrueForge-native execution or transferability.

## Frozen Brief

| Field | Value | Truth state |
| --- | --- | --- |
| customer | Event hoster | confirmed |
| product | DaoHarness on top of the TrueForge harness | confirmed |
| business outcome | Turn accumulated raw event footage into usable, source-linked, approval-gated LinkedIn GTM video/package | confirmed |
| event | `https://luma.com/agent-harness?tk=vhwtdV` | confirmed entry URL; durable readback pending |
| platform | LinkedIn | confirmed |
| duration / language | 30 seconds / English | confirmed |
| edit permission | All edit techniques permitted | confirmed; source constraints still apply |
| CTA | Turn your event footage into GTM | confirmed product/business CTA |
| renderer | HyperFrames-only | confirmed |
| native UI design authority | `/Users/yz/DaoBrewStrategy/explorations/2026-08-18-neobrutal-design-system/report.html` (`Taoist Neo-Brutalism`) | confirmed; apply only through TrueForge-native component controls |
| output | `package_only`, `external_action: false` | immutable |
| demo message | `TrueForge is the harness. DaoHarness ships the real business need.` | confirmed |
| value line | `DaoHarness turns what your business already has into what it needs to ship.` | confirmed for V1 |
| audience | Event hosters and teams with accumulated raw footage that is not yet usable GTM content | derived from confirmed customer/outcome |
| media | Six confirmed user-original MOV files in `handoff.md` | intake/analysis pending |
| primary hook | `You already have the content. It just hasn’t become GTM yet.` | user-selected for V1; not viral-validated |
| BGM | `New Bass 01` by Lily J | provisional; VIDEO_RENDER must freeze/ledger with `media-use` |
| V1 authorization | User said `剪吧，用Record and Replay弄下来` | approved to start VIDEO_RENDER V1; no external-action approval |

## Exactly Three Runtime Agents

```text
TrueForge root: Post Director
  |-- dynamic read-only: Viral Trend Researcher
  `-- dynamic read-only: Media Analyst

Post Director -> human approval -> HyperFrames tool -> technical QA -> package
```

There are exactly three runtime agents total. HyperFrames render is a
deterministic tool; technical QA and package writing are root-owned deterministic
steps, not agents.

## Done When

- Durable `EVENT_RESEARCH` records official facts and
  source-approved event brand assets. Facts obtained only in chat are not a
  durable accepted receipt.
- Separate `VIRAL_RESEARCH` records accepted, current, source-linked LinkedIn
  patterns. No accepted viral evidence exists at bootstrap.
- TrueForge registers Post Director plus exactly the two read-only dynamic
  subagents and a real trace shows both working independently.
- Offline TrueForge contract hardening returns exactly three distinct creative
  directions. For event-host input, the first is event-energy/outcome-led/
  warm-editorial; exactly one is `sarcastic_reaction`, explicitly labelled an
  unvalidated virality hypothesis rather than a performance claim.
- Every direction preserves visible-speaker voice and room ambience, defaults
  to no subtitles, and specifies dynamic ducking for its selected music.
- A read-only native UI audit distinguishes styleable direction/approval
  component content from non-customizable TrueForge host chrome. No custom UI
  workaround is added.
- The six originals remain unchanged and untracked/ignored; Media Analyst emits
  an out-of-Git manifest with hashes, metadata, ownership, and timecodes.
- Human approval binds run, event research, viral research, media manifest, and
  edit-plan digests; missing/stale/mismatched approval fails closed.
- HyperFrames renders the 30-second English asset from original footage and
  source-approved event assets. Canonical Taoist Neo-Brutalism is allowed when
  the deliverable calls for DaoBrew product language; legacy DaoBrew Video/
  DoubleVideo branded outro or caption treatment is never inserted by default
  into an event-hoster customer cut.
- Any separately owned VIDEO_RENDER V1 must not claim viral validation or live
  TrueForge proof; without real UI capture it uses an explicitly labelled honest
  planned-flow visual rather than a fabricated run. It is not current ready work.
- Root-owned technical QA and human visual review pass; root writes the LinkedIn
  package with the product CTA and `external_action: false`; no draft, queue,
  upload, or send occurs.
- VIDEO_RENDER uses `media-use` to freeze the provisional BGM to a local ignored
  asset and ledger its source/license before use; the root never downloads it.
- After a runnable video/flow exists, the user performs a real Record & Replay
  capture that installs/replays as a Codex skill. VIDEO_RENDER does not simulate
  or start that recording.
- `TRANSFER_AUDIT` independently passes Codex replay and TrueForge-native
  manifest/tool/run evidence before the verdict `transferable` is allowed.
- The substantive PR receives initial Qodo review, finding resolution, and a
  follow-up review on corrected head before merge/submission claims.

## Non-Goals

- No real LinkedIn action, multi-platform system, CRM, analytics, or outcome
  claim.
- Luma remains the event-fact/source-asset authority, not the primary CTA.
- No third-party viral-video download/reuse, generated replacement footage,
  arbitrary shell tool, secret exposure, deploy, or extra runtime agent.
- No automatic legacy DaoBrew Video/DoubleVideo outro or caption package in a
  customer cut. This does not prohibit the canonical Taoist Neo-Brutalism
  product design language.

## Read First

- `docs/loop/tracker.md`
- `docs/loop/constraints.md`
- `docs/loop/handoff.md`
- `docs/PROJECT_CONTEXT.md`
- `docs/PROGRESS.md`
