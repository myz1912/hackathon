# DaoHarness

DaoHarness starts from a real business need and turns repeated, human-directed
work into a bounded capability. This hackathon proof focuses on one need:
helping an event organizer turn owned event footage into a 30-second LinkedIn
GTM video.

The user talks to a TrueForge-native `post-director` in natural language,
chooses one business outcome, reviews the plan, and approves a restricted
render tool. Two dynamic subagents research public content patterns and rank
candidate event moments. A fixed HyperFrames bridge then renders a local video
with foreground contemporary jazz and lower room-voice ambience.

## Demo

[Watch or download the 2:58 demo video](demo/daoharness-trueforge-demo.mp4).

The repository copy is H.264/AAC, 576x720 at 30 fps, 178.242 seconds, and
15,446,255 bytes. It is a duration-compliant derivative of the original screen
recording in `/Users/yz/Downloads/Area.mp4`; the complete recording was sped up
slightly rather than cut before the final product preview.

## What the demo proves

- A natural-language event-promotion need enters TrueForge.
- Native TrueForge UI presents three business-outcome choices.
- The user selects one outcome.
- `Viral Trend Researcher` and `Media Analyst` run as two dynamic subagents.
- Bright Data supplies read-only, source-linked public research.
- TrueForge stops at native human approval before `render_event_gtm`.
- The allowlisted local MCP bridge renders a 30-second DaoHarness video.
- The accepted audio mix keeps contemporary jazz in front and room voices
  approximately 8 dB lower.
- The generated video contains no TrueForge or PostForge branding.

## Architecture

```text
Natural-language business need
        |
        v
TrueForge root: post-director
        |-- Viral Trend Researcher -> Bright Data MCP (read-only)
        `-- Media Analyst -> fixed owned-media manifest
        |
        v
Three business-outcome directions
        |
        v
Human choice -> source-linked edit plan -> native approval
        |
        v
daoharness-render-bridge MCP
        |
        v
HyperFrames -> local H.264/AAC video -> playback/download link
```

The bridge is intentionally narrow:

- exactly six allowlisted source MOV filenames;
- bounded source timecodes;
- digest-bound plan and approval receipt;
- one pinned HyperFrames executable and fixed argument array;
- one ignored local output root;
- no arbitrary shell surface;
- no LinkedIn upload or external publication.

## Repository structure

```text
trueforge/post-director.agent.json       TrueForge agent manifest
trueforge/skills.json                    Seven pinned Git skills
trueforge/render-bridge.mcp.json         Local MCP connector declaration
scripts/trueforge-skills.mjs             Skill validation and live sync
scripts/trueforge-smoke.mjs              Offline/live agent validation
scripts/trueforge-render-bridge.mjs      Restricted media/render MCP bridge
tests/trueforge-skills.test.mjs          Skill-registry tests
tests/trueforge-smoke.test.mjs           Agent/session/evidence tests
tests/trueforge-render-bridge.test.mjs   Render-bridge and audio gates
demo/daoharness-trueforge-demo.mp4        Submission demo recording
```

## Local setup

Prerequisites:

- Node.js 22 or newer
- FFmpeg and ffprobe
- TrueForge 0.1.4 running on `127.0.0.1:8790`
- one model configured in TrueForge Settings -> Models
- the six owned event MOVs stored outside Git

Run the non-secret validation gates:

```bash
node --test tests/trueforge-*.test.mjs
node scripts/trueforge-skills.mjs --offline
node scripts/trueforge-smoke.mjs --offline
node scripts/trueforge-render-bridge.mjs --offline
```

Sync skills and register the local bridge:

```bash
node scripts/trueforge-skills.mjs --live
node scripts/trueforge-render-bridge.mjs --register
node scripts/trueforge-render-bridge.mjs --serve
```

Check live readiness without creating an agent or session:

```bash
TRUEFORGE_MODEL='openai/gpt-5-6-sol' \
  node scripts/trueforge-smoke.mjs --live-preflight
```

Open `http://127.0.0.1:8790`, select `post-director`, and describe the event's
audience and desired outcome in natural language.

## Verification snapshot

Latest local verification before publication:

- 55/55 TrueForge tests passed.
- Seven required skills passed offline validation.
- Agent and render-bridge validators returned `OFFLINE_VALID`.
- Live registry readback showed five models, one agent, seven skills, and two
  connectors.
- A real native session showed the three-choice interaction, two subagents,
  human approval, the render call, and a playable local result.
- Accepted Run E audio measured -15.60 LUFS and -1.20 dBTP; music measured
  8.31-8.54 dB above room voices across three representative segments.

## Evidence boundaries

- The code, tests, README, and demo video are merged on `main`. A Git merge and
  push are repository state, not a hosted-product deployment.
- The accepted demo used a reviewed localhost render bridge after TrueForge
  sandbox Git initialization failed. Sandbox success is not claimed.
- Native TrueForge approval was witnessed. The loopback bridge is a demo-grade
  local component, not standalone production authorization against another
  local process.
- Subagent read-only behavior is prompt-enforced; per-subagent capability
  isolation is not claimed.
- Media ranking used a fixed candidate manifest. Raw-pixel inspection inside
  the TrueForge subagent is not claimed.
- `package_only` is not publication. No LinkedIn post, upload, or business
  outcome was performed by the agent.

## Reused dependencies

These dependencies existed before the hackathon and are disclosed rather than
presented as hackathon-original work:

- DaoBrew video craft skill
- HyperFrames runtime and CLI
- media-use asset and provenance workflow

## Submission form answers

### Email

```text
zym1994815@gmail.com
```

### Team name

```text
DaoBrew
```

### Name of the person submitting

```text
Yiming Zhang (Neo)
```

### Names and emails of teammates

```text
Murad - [ADD EMAIL]
Annabel - [ADD EMAIL]
```

### Tracks

```text
Best Use of TrueForge
Best Code Quality
Best UI
Best Use of Bright Data
```

Add `Best LinkedIn post` only after supplying the real public post link.

### GitHub link

```text
https://github.com/myz1912/hackathon
```

### Deployed link

```text
Leave blank. The verified product surface is localhost only.
```

### Video demo link

```text
https://github.com/myz1912/hackathon/blob/main/demo/daoharness-trueforge-demo.mp4
```

### What does your project do?

```text
DaoHarness starts from a real business need and turns repeated, human-directed work into a bounded capability. This demo focuses on Event GTM: an event organizer describes the audience and desired outcome in natural language, then TrueForge coordinates research, media analysis, human choice, approval, and a deterministic video render.

The Post Director dynamically creates a Viral Trend Researcher and a Media Analyst. It combines source-linked public research with a fixed manifest of the organizer's owned footage, presents three business-outcome directions, and waits for the user to choose and approve one. After approval, a restricted HyperFrames bridge produces a local 30-second LinkedIn video with foreground contemporary jazz and lower room-voice ambience.

Event GTM is one DaoHarness capability, not the definition of the whole product. The pattern is real business need, human pull and correction, then a reusable capability with explicit boundaries.
```

### What problem does your project solve, and who is it for?

```text
Event organizers and community teams often have authentic footage but cannot turn it into timely go-to-market content. The strongest moments are scattered across files, public content patterns require research, and creative direction, editing, audio mixing, approval, and QA are normally separate manual workflows.

DaoHarness reduces that coordination burden while preserving human judgment. It is designed for event hosts, community builders, launch teams, and small marketing teams that need to extend an event's reach without replacing real footage with generic generated content.
```

### How did you use TrueForge?

```text
TrueForge is the execution harness for the working product. A root Post Director receives the natural-language business need, creates exactly two dynamic subagents, presents native outcome choices, synthesizes their results, and owns the human-approval boundary.

The Viral Trend Researcher uses the Bright Data MCP connector for read-only public-web research. The Media Analyst ranks a fixed manifest of candidate moments from owned footage. The Post Director then presents three directions and stops for native approval before calling render_event_gtm through a restricted localhost MCP bridge.

The recorded demo shows the real TrueForge session trace, native choice, two subagents, approval receipt, MCP render call, and playable local video. The workflow remains package_only with external_action false.
```

### How did you use Qodo?

```text
We used Qodo as an external review gate on the security-sensitive core pull requests. Its first review found that the apparent approval gate did not cryptographically bind the exact edit plan and action, that media paths could escape the intended root, and that the Bright Data read-only policy was not enforced before process creation.

We addressed those findings in PR #2 by adding canonical SHA-256 plan/action digests, rechecking the approval immediately before rendering, adding realpath-based media-root confinement, and freezing a deny-by-default Bright Data tool allowlist before process spawn. We also expanded the test suite from 12 to 25 tests and added a tamper demo proving that a modified approved plan writes zero artifacts.

Qodo's follow-up review on PR #2 identified two remaining medium issues: filesystem-root separator handling and a possible symlink validation-to-open race around ffprobe. Those findings are documented and are not represented as resolved in this submission. Review trail: https://github.com/myz1912/hackathon/pull/2
```

### How did you use Bright Data?

```text
Bright Data is the read-only public research layer used by the dynamically created Viral Trend Researcher. In the live TrueForge run, it searched public LinkedIn and event-related pages for recent recap and aftermovie patterns relevant to event organizers and future attendees.

The agent preserved direct source URLs and separated observed patterns from creative hypotheses. Scraped content was treated as untrusted data, not instructions. No third-party video was downloaded or reused; Bright Data informed the strategy while final pixels came only from the user's owned event footage.
```

### LinkedIn post links

```text
[ADD NEO LINKEDIN POST URL]
[ADD MURAD LINKEDIN POST URL]
[ADD ANNABEL LINKEDIN POST URL]
```

## AI assistant disclosure

Codex was used for implementation, debugging, testing, and verification.
TrueForge runs the submitted agent workflow. Human owners retain product,
media, publication, and final acceptance authority.
