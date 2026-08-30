# Goal: TrueForge LinkedIn GTM Agent — One-Hour MVP

## Objective

For the event hoster, build the narrowest TrueForge-native workflow that turns
an event brief plus user-original video into a 30-second English LinkedIn GTM
video and copy-ready package. Research is source-linked, the edit plan pauses for
human approval, rendering is HyperFrames-only, and no LinkedIn action occurs.

Capture the runnable workflow with Record & Replay as a Codex skill, then audit
that skill separately against TrueForge-native manifest/tool/run evidence. A
`SKILL.md` alone never proves TrueForge-native execution or transferability.

## Frozen Brief

| Field | Value | Truth state |
| --- | --- | --- |
| customer | Event hoster | confirmed |
| event | `https://luma.com/agent-harness?tk=vhwtdV` | confirmed entry URL; durable readback pending |
| platform | LinkedIn | confirmed |
| duration / language | 30 seconds / English | confirmed |
| edit permission | All edit techniques permitted | confirmed; source constraints still apply |
| CTA | Register for / join the event | confirmed intent; exact copy pending source readback |
| renderer | HyperFrames-only | confirmed |
| output | `package_only`, `external_action: false` | immutable |
| goal | Help the hoster drive qualified registrations | inferred; pending durable source readback/user correction |
| audience | AI agent builders, hackers, technical founders, and likely attendees | inferred; pending durable source readback/user correction |
| media | Six confirmed user-original MOV files in `handoff.md` | intake/analysis pending |
| hook | Recommended direction: Authentic FOMO spoken hook + category/product middle | brainstorm only; not viral-validated; final choice pending user |

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

- Durable `EVENT_RESEARCH` records official facts, corrected goal/audience, and
  source-approved event brand assets. Facts obtained only in chat are not a
  durable accepted receipt.
- Separate `VIRAL_RESEARCH` records accepted, current, source-linked LinkedIn
  patterns. No accepted viral evidence exists at bootstrap.
- TrueForge registers Post Director plus exactly the two read-only dynamic
  subagents and a real trace shows both working independently.
- The six originals remain unchanged and untracked/ignored; Media Analyst emits
  an out-of-Git manifest with hashes, metadata, ownership, and timecodes.
- Human approval binds run, event research, viral research, media manifest, and
  edit-plan digests; missing/stale/mismatched approval fails closed.
- HyperFrames renders the 30-second English asset from original footage and
  source-approved event assets. No DaoBrew Video/DoubleVideo house style or
  DaoBrew outro is used.
- Root-owned technical QA and human visual review pass; root writes the LinkedIn
  package with `external_action: false`; no draft, queue, upload, or send occurs.
- A real Record & Replay capture installs/replays as a Codex skill.
- `TRANSFER_AUDIT` independently passes Codex replay and TrueForge-native
  manifest/tool/run evidence before the verdict `transferable` is allowed.
- The substantive PR receives initial Qodo review, finding resolution, and a
  follow-up review on corrected head before merge/submission claims.

## Non-Goals

- No real LinkedIn action, multi-platform system, CRM, analytics, or outcome
  claim.
- No third-party viral-video download/reuse, generated replacement footage,
  arbitrary shell tool, secret exposure, deploy, or extra runtime agent.
- No DaoBrew Video/DoubleVideo styling and no DaoBrew outro.

## Read First

- `docs/loop/tracker.md`
- `docs/loop/constraints.md`
- `docs/loop/handoff.md`
- `docs/PROJECT_CONTEXT.md`
- `docs/PROGRESS.md`
