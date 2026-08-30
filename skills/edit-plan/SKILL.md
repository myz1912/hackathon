---
name: edit-plan
description: Turn researched hook patterns plus probed media into a source-cited edit plan with exact timecodes. Use after hook-research and before requesting human approval.
---

# Edit plan

Convert patterns and media into segments a human can approve or reject on sight.

## Procedure

1. **Check the media first.** Every segment must fall inside the probed duration of its
   source file. A timecode past the end is a validation failure, not a rounding issue.
2. **Choose the hook from the strongest pattern**, and name which one.
3. **Build segments in order.** Each segment carries:
   `sourcePath` · `startSec` · `endSec` · `reason` · `citation`.
   The `reason` says *why this footage serves that pattern*. The `citation` is the URL of
   the pattern it serves.
4. **Keep it short.** Three segments is usually right for short-form. Adding a fourth
   requires a reason beyond "we have more footage".
5. **Validate before presenting**: durations positive, inside bounds, every segment cited,
   every source path inside the permitted media root.

## Output

`hook` (one line) plus `segments[]`, and the list of citation URLs used.

## Rules

- **No segment without a citation.** If a cut cannot be justified by a researched pattern,
  either find the pattern or drop the cut.
- Do not invent timecodes for footage you have not probed.
- Do not restate the brief back as a plan. A plan makes choices and says why.
- Stop after the plan and hand it to the approval step. **Never render, write, or publish.**
