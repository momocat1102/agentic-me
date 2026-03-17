---
name: Finishing a Development Branch
description: Complete feature development with structured options for merge, PR, or cleanup. Use when implementation is complete, all tests pass, and you need to decide how to integrate the work.
version: 1.1.0
---

# Finishing a Development Branch

## Overview

Guide completion of development work by presenting clear options and handling chosen workflow.

**Core principle:** Verify tests → Present options → Execute choice → Clean up.

**Announce at start:** "I'm using the Finishing a Development Branch skill to complete this work."

## The Process

### Step 1: Verify Tests
Run project's test suite. If tests fail, stop and show failures. Don't proceed.

### Step 2: Determine Base Branch
```bash
git merge-base HEAD main 2>/dev/null || git merge-base HEAD master 2>/dev/null
```

### Step 3: Present Options

Present exactly these 4 options:
1. Merge back to base branch locally
2. Push and create a Pull Request
3. Keep the branch as-is (handle later)
4. Discard this work

### Step 4: Execute Choice

| Option | Action |
|--------|--------|
| 1. Merge locally | checkout base → pull → merge → verify tests → delete branch |
| 2. Create PR | push with -u → gh pr create |
| 3. Keep as-is | report status, don't cleanup |
| 4. Discard | require typed "discard" confirmation → force delete branch |

## Red Flags

**Never:**
- Proceed with failing tests
- Merge without verifying tests on result
- Delete work without confirmation
- Force-push without explicit request

**Always:**
- Verify tests before offering options
- Present exactly 4 options
- Get typed confirmation for discard
