---
name: hook-research
description: Research what is currently working in short-form video hooks on a named platform, using live web search, and return format patterns each tied to a real source URL. Use before proposing any edit plan.
---

# Hook research

Find what is *currently* working, not what a model remembers working.

## Procedure

1. **Search narrow, then widen.** Start with the platform and the year:
   `"<platform> hook patterns <year>"`, `"<platform> first 3 seconds retention"`,
   `"<platform> creative best practices"`. Prefer the platform's own creative
   documentation and ad-product blogs — they publish measured guidance and are citable.
2. **Read before citing.** If a result's snippet is the only thing you have, `scrape_as_markdown`
   it. Never cite a URL whose content you have not seen.
3. **Extract patterns, not adjectives.** A pattern is a testable instruction:
   *"state the outcome before the method"*, *"put the payoff inside the first 2 seconds"*,
   *"keep key information inside the safe area"*. "Be engaging" is not a pattern.
4. **Bind every pattern to one URL** that actually states it.
5. **Stop at 4–6 patterns.** More is not better; they must be distinguishable and each must
   change what the edit plan does.

## Output

For each pattern: `pattern` (imperative sentence) · `evidence` (verbatim snippet) ·
`url` · `publisher` · `collectedAt`.

## Rules

- **Search and scrape only.** Never attempt a write tool.
- **A finding without a URL is dropped, not invented.** If research returns nothing usable,
  say so plainly and let the caller decide — do not fill the gap from memory.
- Prefer sources dated within 18 months. Say so when a source is older and you used it anyway.
- Distinguish *platform guidance* (authoritative) from *agency blog* (interested) from
  *creator anecdote* (weak). Label which you relied on.
