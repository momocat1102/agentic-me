---
name: When Stuck - Problem-Solving Dispatch
description: Diagnose what type of stuck you are and match to the right problem-solving technique. Use when progress has stalled, you're going in circles, or conventional approaches aren't working.
---

# When Stuck - Problem-Solving Dispatch

## Overview

Different stuck-types need different techniques. This skill helps you quickly identify which approach to use.

**Core principle:** Match stuck-symptom to technique.

## Stuck-Type → Technique

| How You're Stuck | What To Do |
|------------------|------------|
| **Complexity spiraling** - Same thing 5+ ways, growing special cases | Look for a unifying abstraction that eliminates cases |
| **Need innovation** - Conventional solutions inadequate | Try cross-domain metaphor: "What if we treated X as Y?" |
| **Recurring patterns** - Same issue different places, reinventing wheels | Extract the common pattern, make it reusable |
| **Forced by assumptions** - "Must be done this way", can't question premise | Invert: "What if the opposite were true?" |
| **Scale uncertainty** - Will it work in production? Edge cases unclear? | Test at extremes: 0, 1, 1000, 1M — what breaks? |
| **Code broken** - Wrong behavior, test failing, unexpected output | Systematic debugging: reproduce → isolate → trace → fix |
| **Multiple independent problems** - Can parallelize investigation | Dispatch parallel agents, each investigating one thread |
| **Root cause unknown** - Symptom clear, cause hidden | Trace backward from symptom through call stack |

## Process

1. **Identify stuck-type** — What symptom matches above?
2. **Apply technique** — Follow the matched approach
3. **If still stuck** — Try a different technique or combine
4. **Document** — Log what you tried and what worked

## Combining Techniques

Some problems need multiple techniques:

- **Simplification + Pattern**: Find pattern, then simplify all instances
- **Cross-domain + Inversion**: Force metaphor, then invert its assumptions
- **Scale + Simplification**: Extremes reveal what to eliminate

## Escalation

After 3 failed techniques: STOP. Ask the human for guidance. Fresh perspective beats repeated attempts.
