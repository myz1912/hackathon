# Implementation Plan

## Dependency order

1. **P0 — Provider readiness:** configure the TrueForge model and read back the provider/model registry.
2. **P1 — Contracts:** freeze brief, research, edit-plan, QA, and publish-packet schemas.
3. **P2 — Read-only tools:** implement Bright Data normalization and media inspection with tests first.
4. **P3 — Orchestration:** register the TrueForge agent and prove parallel subagent traces.
5. **P4 — Write gate:** implement a fixed-argv render tool and require TrueForge approval.
6. **P5 — HyperFrames:** build, check, render, and snapshot the approved composition.
7. **P6 — QA/package:** probe, full-decode, motion-check, visually review, and create the copy-ready packet.
8. **P7 — Review:** push the substantive PR, receive Qodo review, fix or justify findings, request follow-up review, then merge.
9. **P8 — Submission:** update README evidence, record the three-minute demo, and submit.

## First milestone cuts

- Demonstrate one platform end to end; reserve additional platform adapters in the schema.
- Research public metadata and format patterns; do not download third-party social videos.
- Stop at `ready_to_publish`; no real social send in the first milestone.
- Use a small owned demo media set; keep it outside Git.

## Pull request policy

- `main` contains only the honest bootstrap commit until reviewed work merges.
- All substantive work lands on `codex/trueforge-content-agent` or narrower branches.
- Qodo reviews every substantive PR before merge.
- Valid high-severity findings are fixed; dismissals require a technical reason in the Qodo thread.
- A final Qodo review must evaluate the corrected head commit.

