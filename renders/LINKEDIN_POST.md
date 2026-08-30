# LinkedIn post — ready to publish

**Video:** `renders/postforge-linkedin.mp4` · 1080×1350 (4:5) · 22s · 11 MB · **audio + burned-in captions**

---

## Caption

Most AI agent demos end with the agent doing something impressive.

Ours ends with it refusing.

This weekend in San Francisco we spent 9 hours at the Agent Harness Hackathon building an
agent that researches the live web, cites every source it uses, and then stops — because
the next step would change something in the real world.

The part I'd defend in a code review: approval is bound to a hash of the exact plan the
human saw. Approve a plan, change one parameter afterwards, and the write refuses. Not a
confirmation dialog — a fail-closed gate.

We didn't design that. An AI code reviewer found it missing in our first pull request:
the gate printed the exact command, but nothing tied the approval to the *plan*. It looked
fail-closed and wasn't. Three security findings, all valid, all fixed before merge.

That's the bit worth taking away. The interesting question in agent engineering right now
isn't how much an agent can do on its own. It's what it does at the boundary of what you
authorized — and whether you can verify the answer instead of trusting it.

Repo, evidence traces and the tamper test are public. Built with TrueForge, Bright Data,
Qodo and OpenAI.

#AIAgents #SoftwareEngineering #AIEngineering #Hackathon #OpenSource

---

## Why the video is shaped this way

Every choice below traces to a pattern the agent researched, with the source it came from.

| Pattern (researched) | Source | How the video applies it |
|---|---|---|
| Open with insight or stat — never branding. "The first 4–6 seconds are critical." | [LinkedIn Marketing Blog](https://www.linkedin.com/business/marketing/blog/marketing-collective/how-to-create-high-impact-video-with-a-linkedin-expert) — *platform guidance* | Frame 1 is the claim: "We built an AI agent that can't ship without asking a human first." No logo, no title card. |
| State the payoff in the first three seconds. | [Sprout Social](https://sproutsocial.com/insights/linkedin-video/) — *third-party* | The tension is stated before any footage plays. |
| Must be understandable with sound off. | [LinkedIn Marketing Blog](https://www.linkedin.com/business/marketing/blog/linkedin-pages/10-content-ideas-for-your-linkedin-page) — *platform guidance* | Burned-in captions on every beat. **Audio is kept** — captions make it work on mute, they do not replace the room. Levels normalised to −16 LUFS. |
| Vertical, mobile-first composition. | Same — *platform guidance* | 1080×1350 (4:5), the tallest ratio LinkedIn renders in-feed without cropping. |
| Make it about the audience, not the event. | [LinkedIn Marketing Blog](https://www.linkedin.com/business/marketing/blog/marketing-collective/how-to-create-high-impact-video-with-a-linkedin-expert) — *platform guidance* | The caption's payload is the approval-binding idea, not "we attended a hackathon". |
| Show the engineering result, not a feature list. | [LinkedIn short-form insights](https://www.linkedin.com/top-content/marketing/video-marketing-trends/short-form-video-insights/) — *creator anecdote, aggregated* | Beat 5 is the refusal itself: "Change the plan after approval and the write refuses." |

**Provenance:** these patterns were returned by the `hook-research` skill running in the
TrueForge agent via the Bright Data MCP `search_engine` tool, and each is labeled by source
quality — platform guidance, third-party, or creator anecdote — per the `source-discipline`
skill. Nothing here was written from memory.

## The cut

Segments were chosen by **audio energy**, not by looking at frames: each clip was scanned
in 6-second windows with `volumedetect`, and the loudest windows — the talking, reacting
moments — became the cut. `IMG_4199` carried the most vocal energy in the whole set.

| # | Source clip | In | Length | mean vol | Caption beat |
|---|---|---|---|---|---|
| 1 | `IMG_4199.MOV` | 59s | 4.5s | −18.3 dB ← loudest | "We built an AI agent that can't ship without asking a human first" |
| 2 | `IMG_4199.MOV` | 29s | 4.0s | −19.1 dB | "9 hours. San Francisco." |
| 3 | `IMG_4196.MOV` | 23s | 3.5s | −22.9 dB | "It researches the live web and cites every source" |
| 4 | `IMG_4199.MOV` | 5s | 3.5s | −19.4 dB | "Then it stops." |
| 5 | `IMG_4200.MOV` | 57s | 3.5s | — | "Change the plan after approval and the write refuses" |
| 6 | `IMG_4192.MOV` | 2s | 3.0s | — | "Approval you can verify." |

Reproduce: `bash renders/render-linkedin.sh` (source clips are gitignored — they are the
team's own footage and stay out of the repo).

## Before you post

- Watch it once on a phone with sound off. That is how it will be seen.
- The footage shows other attendees. **Get their nod before this goes public.**
- Swap the repo link into the caption if you want the click.
