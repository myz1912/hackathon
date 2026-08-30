# Team Ownership

## Murad — Competition integrations

Owns:

- TrueForge process, model, agent registry, sandbox, session trace, and approval evidence;
- Bright Data connector, read-only allowlist, live research receipt, and provenance;
- GitHub PR discipline, Qodo initial review, remediation decisions, follow-up review, and qualification checklist.

Acceptance evidence:

- TrueForge agent/session IDs and a successful traced run;
- Bright Data tool call with source URLs and collection timestamps;
- public PR URL showing Qodo findings, responses, fixes, and final review.

## Neo — Video

Owns:

- the goal, audience, platform, source media, hook decision, and edit approval;
- DaoBrew video style and any explicit permission to trim, crop, reframe, or change orientation;
- HyperFrames visual direction and final human visual acceptance;
- platform copy judgment and final publication authority.

Acceptance evidence:

- exact selected source timecodes and approved edit plan;
- source-faithful render, contact sheet, and visual-review record;
- explicit approval references for edit and any later external action.

## Annabel — Multi-agent framework

Owns:

- root/subagent responsibilities, input/output schemas, state machine, and failure handling;
- deterministic tool boundaries and root-owned approvals;
- context isolation, result synthesis, prompt-injection handling, and retry limits;
- integration tests covering orchestration contracts and blocked states.

Acceptance evidence:

- reviewed agent manifest and MCP contracts;
- traces showing independent research and media-analysis subagents;
- tests proving invalid input, tool failure, stale evidence, and missing approval fail closed.

## Shared gates

| Gate | Murad | Neo | Annabel |
|---|---|---|---|
| Competition qualification | A/R | C | C |
| Bright Data source quality | A/R | C | C |
| Edit plan | C | A/R | C |
| Multi-agent contract | C | C | A/R |
| Render QA | C | A/R | C |
| Qodo remediation | A/R | C | R |
| External publication | C | A/R | C |

`A` = accountable, `R` = responsible, `C` = consulted.

