# DaoBrew PostForge

DaoBrew PostForge is a TrueForge-native multi-agent workflow that turns a goal,
audience, platform, and owned media into a researched, edited, QA-verified,
copy-ready social post package.

The submission is being built on August 29, 2026 for the TrueForge Agent Harness
Hackathon. Submission-specific code is developed through pull requests reviewed
by Qodo. Existing DaoBrew video skills and HyperFrames are disclosed dependencies;
they are not presented as hackathon-original work.

## Team

- **Murad — Competition integrations:** TrueForge, Bright Data, Qodo, and qualification evidence.
- **Neo — Video:** DaoBrew video direction, source approval, HyperFrames output, and visual acceptance.
- **Annabel — Multi-agent framework:** agent boundaries, orchestration, contracts, and failure handling.

## Current status

See the evidence-bounded [project context](docs/PROJECT_CONTEXT.md),
[team ownership](docs/TEAM_OWNERSHIP.md), [implementation plan](docs/IMPLEMENTATION_PLAN.md),
[progress log](docs/PROGRESS.md), and [two-axis status report](docs/status.html).

## Required stack

- **TrueForge:** root agent, dynamic subagents, sandbox, MCP tools, and human approval.
- **Bright Data:** live, read-only public-web research with source provenance.
- **Qodo:** initial PR review, documented fixes or reasoned dismissals, and follow-up review before merge.
- **HyperFrames + daobrew-video:** deterministic video composition, house style, and visual/technical QA.

## Truth boundary

`package-ready` is not `published`. The first milestone stops at a verified,
copy-ready package with `external_action: false`. Direct posting requires a
separate exact-action approval and platform connector.

## Qodo Code Review Evidence

Pending the first substantive pull request. This section will link the merged
PR, summarize Qodo findings, record fixes or justified dismissals, and link the
final follow-up review.

## AI assistant disclosure

Codex is used for implementation and verification. TrueForge runs the submitted
agent workflow. Human owners retain product, media, publication, and acceptance authority.
