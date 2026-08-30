# DaoHarness

DaoHarness takes a plain-English business request and turns it into an approved,
finished deliverable.

This demo starts with one sentence:

> Make this event reach more people.

TrueForge runs the workflow. Two agents research public content patterns and
pick useful moments from owned event footage. The user chooses a direction,
reviews the plan, and approves the render. DaoHarness then produces a 30-second
LinkedIn GTM video with foreground contemporary jazz and lower room ambience.

Event GTM is one DaoHarness capability. The larger product idea is simple:
capabilities grow from repeated real work and human correction.

## Watch the demo

[Watch or download the 2:58 demo video](demo/daoharness-trueforge-demo.mp4).

The repository copy is 15.4 MB, H.264/AAC, and under the three-minute submission
limit.

## What happens in the demo

1. The user describes the audience and desired outcome in natural language.
2. `post-director` creates `Viral Trend Researcher` and `Media Analyst`.
3. Bright Data supplies source-linked, read-only public research.
4. TrueForge presents three business-outcome choices.
5. The user selects one direction.
6. TrueForge stops for native approval before `render_event_gtm` runs.
7. A restricted HyperFrames bridge renders the video and returns a playback link.

The generated video uses DaoHarness branding only. TrueForge and PostForge do
not appear in its pixels or metadata.

## How it is built

```text
Natural-language request
        |
        v
TrueForge post-director
        |-- Viral Trend Researcher -> Bright Data MCP
        `-- Media Analyst -> owned-media manifest
        |
        v
Three directions -> human choice -> approval
        |
        v
daoharness-render-bridge MCP -> HyperFrames -> local MP4
```

The render bridge has a small attack surface:

- six allowlisted source filenames;
- bounded source timecodes;
- digest-bound plan and approval data;
- fixed executable and argument arrays;
- one local output root;
- no arbitrary shell commands;
- no social upload or external publication.

## Run it locally

Requirements:

- Node.js 22+
- FFmpeg and ffprobe
- TrueForge 0.1.4 on `127.0.0.1:8790`
- one model configured in TrueForge
- the six owned event MOVs stored outside Git

Verify the repository:

```bash
node --test tests/trueforge-*.test.mjs
node scripts/trueforge-skills.mjs --offline
node scripts/trueforge-smoke.mjs --offline
node scripts/trueforge-render-bridge.mjs --offline
```

Connect the live TrueForge pieces:

```bash
node scripts/trueforge-skills.mjs --live
node scripts/trueforge-render-bridge.mjs --register
node scripts/trueforge-render-bridge.mjs --serve

TRUEFORGE_MODEL='openai/gpt-5-6-sol' \
  node scripts/trueforge-smoke.mjs --live-preflight
```

Open `http://127.0.0.1:8790`, select `post-director`, and describe the event in
the chat box.

## Repository map

```text
trueforge/post-director.agent.json        TrueForge agent manifest
trueforge/skills.json                     Seven pinned skills
trueforge/render-bridge.mcp.json          Local MCP declaration
scripts/trueforge-skills.mjs              Skill sync and validation
scripts/trueforge-smoke.mjs               Agent and live-evidence validation
scripts/trueforge-render-bridge.mjs       Restricted video renderer
tests/                                    Render-bridge and session tests
demo/daoharness-trueforge-demo.mp4         Submission demo
```

## Verification

The cleanup commit is accepted only when all 55 TrueForge bridge/session tests
pass and the demo video passes decode and duration checks.

The recorded live run showed five configured models, one agent, seven skills,
two MCP connectors, three native choices, two subagents, human approval, the
render call, and a playable local video.

The accepted audio mix measured `-15.60 LUFS` and `-1.20 dBTP`. Jazz sat
`8.31-8.54 dB` above room voices in three measured segments.

## Known limits

- The product runs on localhost. There is no deployed public app URL.
- TrueForge sandbox Git initialization failed in one recorded run. The reviewed
  localhost render bridge completed the demo render; sandbox success is not claimed.
- Native approval was visible in TrueForge. The localhost bridge remains a
  demo-grade local component, not a production authorization service.
- Media ranking used a fixed candidate manifest. Raw-pixel inspection inside the
  TrueForge subagent is not claimed.
- The workflow stops at `package_only`. It did not publish to LinkedIn.

## Submission Form Answers

### Email

```text
zym1994815@gmail.com
```

### Team name

```text
DaoBrew
```

### Person submitting

```text
Yiming Zhang (Neo)
```

### Teammates

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

Add `Best LinkedIn post` after adding a real public post link.

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
DaoHarness turns a natural-language business need into an approved deliverable. This demo focuses on Event GTM. An event organizer describes the audience and goal, TrueForge coordinates public research and media analysis, the user chooses a direction, and a restricted HyperFrames tool renders the final video.

The Post Director creates a Viral Trend Researcher and a Media Analyst. It combines source-linked research with a fixed manifest of owned footage, presents three directions, and waits for human approval. After approval, DaoHarness produces a 30-second LinkedIn video with foreground contemporary jazz and lower room ambience.

Event GTM is one bounded DaoHarness capability. The same product pattern can support another capability only after a real business need and human corrections define its inputs, method, permissions, and output.
```

### What problem does your project solve, and who is it for?

```text
Event organizers often finish an event with useful footage but no clear path to a strong go-to-market asset. The best moments are scattered across files, public content patterns require research, and creative direction, editing, approval, audio mixing, and QA usually happen in separate tools.

DaoHarness connects those steps while keeping the organizer in control. It is built for event hosts, community builders, launch teams, and small marketing teams that want to extend an event's reach using their own footage.
```

### How did you use TrueForge?

```text
TrueForge runs the working agent flow. A root Post Director receives the natural-language request, creates exactly two subagents, presents native choices, combines their results, and owns the human-approval boundary.

The Viral Trend Researcher uses Bright Data through MCP. The Media Analyst ranks candidate moments from owned footage. The Post Director then stops for native approval before calling render_event_gtm through a restricted localhost MCP bridge.

The demo records the real TrueForge session, subagent trace, approval, render call, and playable output. The workflow stays package_only with external_action false.
```

### How did you use Qodo?

```text
Qodo reviewed the earlier security-sensitive core pull requests. It found that the first approval gate did not bind the exact plan and render action, that media paths could escape the intended root, and that the Bright Data read-only policy was not enforced before process creation.

Those findings shaped the final bridge: canonical SHA-256 plan and action digests, approval rechecks immediately before rendering, confined media paths, and a deny-by-default Bright Data tool allowlist. Follow-up Qodo reviews found additional path, SSE, approval-order, timeout, and cleanup issues. The review history remains available in PR #2 and PR #3 even though the early duplicate core was removed from the final submission tree.

Review trail:
https://github.com/myz1912/hackathon/pull/2
https://github.com/myz1912/hackathon/pull/3
```

### How did you use Bright Data?

```text
Bright Data is the read-only research layer used by the Viral Trend Researcher. In the live TrueForge run, it searched public LinkedIn and event pages for recent recap and aftermovie patterns relevant to event organizers and future attendees.

The agent kept direct source URLs and separated observed patterns from creative hypotheses. It did not download or reuse third-party videos. Bright Data informed the plan; the final video used the user's owned event footage.
```

### LinkedIn post links

```text
[ADD NEO LINKEDIN POST URL]
[ADD MURAD LINKEDIN POST URL]
[ADD ANNABEL LINKEDIN POST URL]
```

## Disclosure

Codex assisted with implementation, debugging, testing, and verification.
TrueForge runs the submitted agent workflow. Humans retain product, media,
publication, and final acceptance authority.
