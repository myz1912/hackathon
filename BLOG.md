# The approval gate that wasn't

*Building an agent in a day, and the review that caught us claiming a safety property we
did not have.*

---

Most agent demos end with the agent doing something impressive. Ours ends with it refusing.

We spent 29 August 2026 at the Agent Harness Hackathon in San Francisco building
**PostForge** on TrueForge — an agent that researches the live web, cites every source it
uses, drafts a plan, and then stops, because the next step would change something real.

This is the writeup of how it was wired, and of the one finding that made the project
honest.

## The shape

```
brief + owned media
        │
        ▼
  Post Director  ──┬── Trend Researcher  → Bright Data MCP (read-only, allowlisted)
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

Nothing here posts anything. `package-ready` is not `published`, and we drew that line in
the contract rather than in a README paragraph: the packet type carries
`external_action: false` as a literal.

## What the harness actually did for us

The temptation with a harness is to treat it as a runtime you could swap out. Three things
made TrueForge load-bearing rather than decorative:

**The approval gate is the harness's, not ours.** We declared which MCP tools need approval
— `@write`, `@destructive` — and TrueForge enforces the pause. We did not reimplement a
confirmation dialog and call it safety. There is a real difference, and a judge can see it
by looking at where the pause originates.

**Skills are Git-backed.** Five `SKILL.md` packages live in our public repo; TrueForge
fetches them and the agent loads a skill's body only when the task calls for it. The
progressive part matters: the agent sees names and descriptions cheaply, and pays for the
content only when it commits to using one. In one session the skills cost 375 input tokens
against 3,618 for the harness itself.

**Skills require a sandbox — and that bit us usefully.** Skills are materialized inside the
sandbox, so with `config.sandbox.enabled: false` the agent has no skill-loading tool at all.
We had it off. Asked to quote one of its own skills, the agent replied:

> *"I can't load or inspect a `source-discipline` skill because no skill-loading tool is
> available in this session. I won't invent or misquote its rules."*

Which is exactly what `source-discipline` demands — arrived at without having read it. We
enabled the sandbox and it loaded the file and quoted it verbatim.

## The finding

We opened our first pull request and ran Qodo's `/agentic_review` on it. It returned four
findings. Three were High, and one of them was the project.

> **"Approval does not bind render."** The workflow approves an edit plan but never binds
> that approval to an immutable plan digest and exact render arguments, so the plan or
> source/timecode parameters can change after approval while the render still appears
> authorized. This defeats the stated fail-closed human write gate.

It was right. Our gate printed the exact tool and argv before running — which felt rigorous
— but nothing tied the approval to the **plan**. Change one timecode between approval and
render and the invocation still looks authorized, because the invocation *is* the same. The
gate looked fail-closed and was not.

The fix is old and boring: canonicalize the plan with sorted keys and stable number
formatting, hash it, and carry the digest the human actually saw.

```ts
const approved = actionDigest(proposal);   // shown to the human
// ... time passes, plan may mutate ...
const current  = actionDigest(rebuild());  // recomputed at the write
if (current !== approved) throw new ApprovalMismatchError(approved, current);
```

`renderPackage` recomputes immediately before writing and refuses on any difference. There
is no bypass flag, because a bypass flag is how this defect comes back.

Then we made the refusal demonstrable instead of asserted. `npm run demo -- --tamper`
approves a plan, mutates one timecode, and attempts the render:

```
16  approval_requested  planDigest 19fbb510…  digest 21a21134…
17  approval_decided    approved=true         approvedDigest 21a21134…
18  approval_mismatch   approved 21a21134…    current f9e4c18a…
```

Measured with `artifacts/` deleted first: **tamper writes 0 files, approve writes exactly 1.**

The other two High findings were the same species. Media paths were accepted without an
allowed root, so we added `resolveWithinRoot` — realpath-based, rejecting traversal, symlink
escape, and the sibling-prefix case a naive string compare misses, where `/media-evil`
passes a check for `/media`. And "read-only research" was policy prose rather than
enforcement, so it became a frozen tool-id allowlist that denies by default, checked before
any process spawn rather than after.

Test count went from 12 to 25 across those fixes, and later to 31. No existing test was
weakened to make a new one pass.

## Things that broke

**`127.0.0.1` does not reach TrueForge.** In standalone mode it binds IPv6 localhost. Our
own `.env.example` documented the IPv4 address, which means anyone following our setup
would have lost time on a dead connection. `curl 127.0.0.1:8790` fails; `curl
localhost:8790` returns 200.

**A CLI alias we declared invented.** We wrote a rule saying "the binary is `brightdata`,
not `bdata`" and used it to tell a teammate their command was made up. Qodo flagged it. The
npm manifest declares `{ brightdata: 'dist/index.js', bdata: 'dist/index.js' }` — both
install, identical entry point. We were wrong, and the correction is kept visible in the doc
rather than quietly edited, because the wrong version had already cost someone time.

**A rule with a hole in it.** Our scraper contract listed commands with literal ellipses —
`brightdata scraper create ...` — while requiring `--help` only for commands *absent* from
the page. Qodo saw the trap: an assistant treats the listed commands as verified and still
guesses the arguments. The rule now counts a command as verified only when its full
signature including positionals is documented, and the raw `--help` output is committed.

**Our own verification lied to us once.** Testing whether the tamper path wrote a file, we
ran `find artifacts -type f && echo "WROTE A FILE"`. `find` exits 0 when it finds nothing,
so the message fired on an empty result and we briefly believed the gate had leaked. The
check was wrong, not the code. A check that measures the wrong thing passes — or fails —
forever.

**`drawtext` was not available.** Rendering the demo video, ffmpeg refused: `No such
filter: 'drawtext'` — the build lacks freetype. Captions became Pillow-rendered PNG cards
composited with `overlay`. Worth knowing before you plan a caption-heavy cut.

**And we stripped the audio.** Platform guidance says social video must be understandable
with sound off. We read that as "remove the audio track". It means *captions*, and silence
removes the reactions that make a clip worth sharing at all. Corrected: audio kept,
normalized to −16 LUFS, captions burned in. Segments were then chosen by scanning each clip
in six-second windows with `volumedetect` and taking the loudest — the moments where people
are actually talking. That finds energy reliably. It cannot tell a joke from a dry
explanation, and we say so rather than implying the machine has taste.

## What we would not claim

The agent researched the patterns that shaped our demo video — the 4:5 ratio, the
caption-first opening, keeping the audio — each with a source URL and each labeled by
source quality: platform guidance, third-party, or creator anecdote. That labeling is a
skill doing its job.

The video itself was cut by a human. The pipeline can produce an edit *plan*; it does not
render, because we never implemented that. We wrote the editing skill afterwards, from what
the hand-cut actually taught, so the next one can be the agent's.

That distinction is the whole point of the project. An agent that tells you what it did not
do is worth more than one that blurs the line, and a gate you can watch refuse is worth more
than a gate you are told is safe.

---

*Built with TrueForge, Bright Data, Qodo and OpenAI. Repo, evidence traces and the tamper
test are public. AI coding assistance was used throughout and is disclosed.*
