# Demo runbook

Everything below has been run end to end. Times are wall-clock from a cold start.

## Before you present (5 min)

```bash
npx @truefoundry/trueforge@latest        # v0.1.4 → http://localhost:8790
brightdata login                         # if not already logged in
```

Open **http://localhost:8790** — *not* `127.0.0.1`. TrueForge binds IPv6 localhost in
standalone mode and the IPv4 address will not connect.

**Verify the three things the demo depends on, in one paste:**

```bash
curl -s http://localhost:8790/api/v1/agents | grep -o postforge-director
curl -s http://localhost:8790/api/v1/settings/mcp-servers | grep -o '"status":"authenticated"'
curl -s http://localhost:8790/api/v1/mcp-servers/brightdata/tools | grep -c search_engine
```
Expect: `postforge-director`, `"status":"authenticated"`, `1`.

If the MCP server shows anything other than authenticated, re-run `brightdata login` and
re-create the server — the stored header credential is tied to the key that was current
when it was registered.

## Already configured (verified live)

| | |
|---|---|
| Model provider | `openai` → `gpt-5.6-sol` |
| Agent | `postforge-director` · `01m180kjd2h4b66177be3nxfa8` |
| MCP server | `brightdata` · authenticated · 5 tools discovered |
| Tools enabled | `search_engine`, `scrape_as_markdown` — **read-only** |
| Approval gating | `@write`, `@destructive` — native TrueForge, not reimplemented |

## The 3-minute run

### 1 · Open the agent in the TrueForge UI (20s)
Show the agent config: the model, the `brightdata` MCP server, and that only two read-only
tools are enabled. **Say the line:** *"the approval gate is the harness's, not ours — we
declared which tools need it, TrueForge enforces it."*

### 2 · Paste the brief (10s)

> Brief: goal = show developers that PostForge turns owned clips into a source-backed
> short-form package; audience = developer-tool builders; platform = tiktok; media =
> demo-hook.mp4 (0–6s), demo-proof.mp4 (0–8s). Research current TikTok short-form hook
> patterns, then give me an edit plan with citations. Stop for my approval.

### 3 · Watch it work (~60s)
Real, measured on the recorded run: **9 MCP tool calls**, 5590 input / 1465 output tokens.
Expand a `search_engine` call and show the live results coming back.

### 4 · Point at the citations (20s)
The plan cites URLs that came from the live search — these four appeared in the recorded
run:
- `ads.tiktok.com/business/en/blog/tiktok-short-video-best-practice`
- `ads.tiktok.com/business/en/blog/creative-best-practices-top-performing`
- `ads.tiktok.com/business/creativecenter/quicktok/online/tiktok_creative`
- `ads.tiktok.com/business/en-US/creative-codes`

**Say the line:** *"every segment must cite a URL that research actually returned. A finding
without a URL is dropped, never invented."*

### 5 · The gate refuses a tampered plan (40s) ← **the beat that lands**

In a terminal:
```bash
rm -rf artifacts && npm run demo -- --tamper
```

Show the trace: the human approved digest `21a21134…`, the plan then changed to
`f9e4c18a…`, and the write was refused.

```bash
find artifacts -type f | wc -l     # 0 — nothing was written
npm run demo -- --approve
find artifacts -type f | wc -l     # 1 — the packet
```

**Say the line:** *"approval is bound to a hash of the exact plan the human saw. Change one
timecode after approval and the write refuses. Qodo found this missing in our first PR — it
looked fail-closed and wasn't."*

### 6 · Close on the packet (20s)
`external_action: false`. Package-ready is not published; posting would need a separate
exact-action approval and a connector, and neither exists.

## If something breaks on stage

| Failure | Fallback |
|---|---|
| Wi-Fi dies mid-research | `npm run demo -- --approve` runs fully offline on fixtures and still shows the plan, gate and packet |
| MCP auth expired | Show `docs/evidence/trueforge-session-events.json` — the recorded 9-tool-call session |
| TrueForge won't start | Port in use: another instance is already running, just open the browser |
| Model slow | The tamper beat needs no model at all — lead with it |

## What not to claim

- HyperFrames rendering is not implemented.
- The in-repo pipeline's subagents run in-process; the TrueForge agent does the research
  through MCP. Do not describe them as the same thing.
- No post, upload, or send happens anywhere.
