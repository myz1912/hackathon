# Evidence

Captured 2026-08-29 from live runs. Nothing here is illustrative.

| File | What it proves |
|---|---|
| `trueforge-session-events.json` | A real TrueForge session against `openai/gpt-5-6-sol`: **9 MCP tool responses**, `mcp.initialize`, `turn.done`, 5590 in / 1465 out tokens |
| `live-research-receipt.json` | A real Bright Data SERP call with a Bright Data `request_id` and 8 source URLs |

## TrueForge configuration (live, verified)

```
agent            postforge-director   id 01m180kjd2h4b66177be3nxfa8
model            openai/gpt-5-6-sol
mcp server       brightdata           auth_status: authenticated, 5 tools discovered
enable_tools     search_engine, scrape_as_markdown        ← read-only
require_approval @write, @destructive                     ← native harness gating
```

The agent cited these live-researched sources in its edit plan:

- https://ads.tiktok.com/business/en/blog/tiktok-short-video-best-practice
- https://ads.tiktok.com/business/en/blog/creative-best-practices-top-performing
- https://ads.tiktok.com/business/creativecenter/quicktok/online/tiktok_creative
- https://ads.tiktok.com/business/en-US/creative-codes

## Reproducing

TrueForge binds IPv6 localhost — use `http://localhost:8790`, not `127.0.0.1`.

```bash
npx @truefoundry/trueforge@latest        # v0.1.4, port 8790
brightdata login                         # stores credentials the CLI and MCP reuse
curl -s http://localhost:8790/api/v1/agents
curl -s http://localhost:8790/api/v1/sessions/<id>/events
```
