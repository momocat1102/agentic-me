---
name: debug
description: >
  Universal debugging skill for any bug, test failure, unexpected behavior,
  performance issue, build error, or code review. Covers root cause analysis,
  test failure resolution, security auditing, and production debugging across
  all languages and frameworks. Use BEFORE proposing fixes for any technical
  issue — even if it seems simple. Also use when asked to review code for bugs,
  debug a failing test, investigate performance, or track down an error.
---

# Debug

## The Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

If you haven't completed Phase 1, you cannot propose fixes.
Random fixes waste time, create new bugs, and mask underlying issues.

## When to Use

- Any bug, error, or unexpected behavior
- Test failures (single or batch)
- Build / compilation errors
- Performance problems
- Security review of branch changes
- Integration issues between components
- "It works on my machine" situations

**Especially when:**
- Under time pressure (emergencies make guessing tempting)
- "Just one quick fix" seems obvious
- You've already tried multiple fixes
- You don't fully understand the issue

## Phase 1: Triage & Root Cause Investigation

### 1.1 Read Error Messages Completely

- Full stack traces, error codes, line numbers, file paths
- Don't skip warnings — they often pinpoint the real issue
- Note the first error in a cascade (later errors are often symptoms)

### 1.2 Reproduce Consistently

- Get exact steps to trigger the issue
- Can you trigger it reliably? Every time or intermittently?
- Document environment details (OS, Python version, CUDA, etc.)
- If NOT reproducible: gather more data, add logging, do NOT guess

### 1.3 Check Recent Changes

- `git diff`, `git log --oneline -10`, recent commits
- New dependencies, config changes
- Environmental differences (dev vs CI, different machine, etc.)

### 1.4 Gather Evidence at Component Boundaries

When the system has multiple components (e.g., Python → C++ extension,
Ray actor → learner, network → solver):

```
For EACH component boundary:
  - Log what data enters the component
  - Log what data exits the component
  - Verify environment/config propagation
  - Check state at each layer

Run once to gather evidence showing WHERE it breaks
THEN analyze evidence to identify the failing component
THEN investigate that specific component
```

### 1.5 Trace Data Flow Backward

Start at the symptom and ask "what called this with this value?"

```
Symptom: RuntimeError in forward()
  ↓ What tensor caused it?
  ↓ Where was that tensor created?
  ↓ What function produced wrong shape?
  ↓ What config value was read?
  → Root cause: config.observation_shape mismatch
```

Fix at the SOURCE, not where the error appears.

## Phase 2: Classify & Select Strategy

Based on the issue type, select the right approach and load the relevant
domain reference. Only load what you need.

### Batch Test Failures

When facing multiple test failures:

1. Group by error type (ImportError, AttributeError, AssertionError, etc.)
2. Group by root cause (missing dep, API change, logic bug)
3. Fix order: Infrastructure → API changes → Logic issues
4. Verify each group before moving to next
5. Run full suite after all groups

→ Load `references/test-resolution.md` for detailed patterns

### Security / Code Review

When reviewing branch changes for bugs:

1. Get full diff against default branch
2. Map attack surface per file (inputs, state operations, auth checks)
3. Apply security checklist per file
4. Verify each finding against surrounding context

→ Load `references/security-audit.md` for OWASP checklist

### Performance Issues

1. Profile first — do NOT optimize blindly
2. Measure before and after every change
3. Common culprits: N+1 queries, unnecessary computation, sync I/O, memory leaks

→ Load the relevant language reference for profiling tools

### Intermittent / Flaky Issues

1. Add timing and state-transition logging
2. Check for race conditions, async ordering, shared mutable state
3. Use condition-based waiting instead of arbitrary sleeps
4. Stress test with varied timing and load

## Phase 3: Hypothesis & Testing

### Form a Single Hypothesis

- State clearly: "I think X is the root cause because Y"
- Be specific — "something is wrong with the config" is not a hypothesis

### Test Minimally

- Make the SMALLEST possible change to test the hypothesis
- One variable at a time
- Do NOT fix multiple things at once

### Verify or Pivot

- Confirmed → proceed to Phase 4
- Disproved → form NEW hypothesis, return to Phase 1 evidence
- Do NOT stack fixes on top of each other

### Escalation Rule

If **3+ fixes have failed**: STOP.

- Each fix revealing new problems in different places = architectural issue
- Question the fundamental approach, not just the symptoms
- Discuss with the human before attempting fix #4

## Phase 4: Fix & Verify

### 4.1 Create Failing Test (when possible)

- Simplest reproduction as automated test
- Must exist BEFORE implementing fix
- One-off test script if no framework applies

### 4.2 Implement Single Fix

- Address root cause ONLY
- ONE change at a time
- No "while I'm here" improvements or bundled refactoring

### 4.3 Verify

- Original test passes
- No regressions in full suite
- Issue actually resolved (not just masked)

### 4.4 Defense in Depth (for critical fixes)

After fixing root cause, consider adding validation at multiple layers:

1. **Entry point**: reject bad input at the boundary
2. **Business logic**: data makes sense for this operation
3. **Environment guard**: prevent dangerous ops in wrong context
4. **Instrumentation**: logging for future forensics

## Red Flags — STOP and Return to Phase 1

If you catch yourself thinking any of these:

- "Quick fix for now, investigate later"
- "Just try changing X and see if it works"
- "Add multiple changes, run tests"
- "It's probably X, let me fix that"
- "I don't fully understand but this might work"
- Proposing solutions before tracing data flow
- "One more fix attempt" (when already tried 2+)
- Each fix reveals new problems in different places

**ALL of these mean: STOP. Return to Phase 1.**

## Domain-Specific References

Load the relevant reference when the issue matches that domain.
Only load what you need — do not load all references at once.

| Domain | Reference File | When to Load |
| --- | --- | --- |
| Python / PyTorch | `references/python-pytorch.md` | Gradient issues, NaN, tensor errors, loss debugging, profiling |
| C++ / pybind11 | `references/cpp-pybind11.md` | Native extension build errors, segfaults, C++ debug APIs |
| Ray distributed | `references/ray-distributed.md` | Actor errors, weight sync, Object Store, serialization |
| Test resolution | `references/test-resolution.md` | Batch test failures, pytest patterns, mock/fixture strategies |
| Security audit | `references/security-audit.md` | Code review, OWASP checklist, branch diff analysis |
| Web / Browser | `references/web-browser.md` | JS/Node debugging, DevTools *(optional, for web projects)* |

## Project-Specific Knowledge

When debugging in this specific project, load `references/project/stochastic-muzero.md`
for known issues, debug APIs, environment gotchas, and discovered patterns.

This file is designed to grow over time — append new findings as you discover them.

## Quick Reference

| Phase | Key Activities | Done When |
| --- | --- | --- |
| 1. Triage | Read errors, reproduce, check changes, trace data | Understand WHAT and WHY |
| 2. Classify | Select strategy, load domain reference | Know the approach |
| 3. Hypothesis | Form theory, test minimally, verify or pivot | Confirmed root cause |
| 4. Fix & Verify | Create test, fix root cause, verify no regressions | Bug resolved, tests pass |
