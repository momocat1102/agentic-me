---
name: Search First
description: "Before building anything new, search for existing solutions — packages, utilities, MCP tools, or codebase patterns. Use when about to create a new utility, add a dependency, or implement common functionality."
origin: ECC
---

# Search First

Before writing new code, search for existing solutions.

## When to Activate

- About to create a new utility function
- About to add a new dependency
- Implementing common functionality (HTTP, parsing, caching, etc.)
- Building something that "surely exists already"

## Workflow

```
Need identified
  → Search codebase (existing utilities?)
  → Search packages (npm/pip/cargo?)
  → Search MCP tools (available already?)
  → Evaluate options
  → Decide: Adopt / Extend / Compose / Build
```

## Quick Mode (Inline Checklist)

Before writing new code, ask yourself:

1. **Codebase**: `grep -r "similar_function" src/` — Does this exist already?
2. **Packages**: Is there a well-maintained package for this? (>1K stars, recent updates)
3. **MCP tools**: Is there an MCP tool that does this?
4. **Standard library**: Does the language's stdlib handle this?

If any answer is YES → use it instead of building.

## Decision Matrix

| Situation | Action |
|-----------|--------|
| Perfect existing solution | **Adopt** — use as-is |
| 80% solution exists | **Extend** — wrap or extend it |
| Multiple partial solutions | **Compose** — combine them |
| Nothing exists | **Build** — but keep it minimal |

## Search Shortcuts by Category

| Need | Where to Look |
|------|---------------|
| HTTP client | `aiohttp`, `httpx`, `requests` (Python) / `fetch`, `axios` (JS) |
| CLI parsing | `argparse`, `click`, `typer` (Python) / `commander` (JS) |
| Date/time | `datetime`, `pendulum` (Python) / `date-fns`, `dayjs` (JS) |
| Config | `pydantic-settings` (Python) / `dotenv` (JS) |
| Testing | `pytest` (Python) / `vitest`, `jest` (JS) |
| Validation | `pydantic` (Python) / `zod` (JS) |
| File operations | `pathlib` (Python) / `fs-extra` (JS) |

## Anti-Patterns

| Don't | Do |
|-------|-----|
| Jump straight to coding | Search first, code second |
| Ignore existing utils in codebase | `grep` before creating |
| Add heavy dependency for small task | Use stdlib or write 10 lines |
| Over-customize a library | Use it as designed, or don't use it |
| Add 5 deps for one feature | Pick one good library |

## Remember

**The best code is code you don't write.**

Three lines of existing code > a new 50-line utility.
