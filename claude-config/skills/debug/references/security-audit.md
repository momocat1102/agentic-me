# Security Audit Reference

## 5-Phase Code Review Process

### Phase 1: Complete Input Gathering

1. Get full diff: `git diff $(git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@')...HEAD`
2. If output is truncated, read each changed file individually
3. List all modified files before proceeding

### Phase 2: Attack Surface Mapping

For each changed file, identify and list:

- All user inputs (request params, headers, body, URL components)
- All database queries
- All authentication/authorization checks
- All session/state operations
- All external calls (APIs, subprocesses, file I/O)
- All cryptographic operations

### Phase 3: Security Checklist

Check EVERY item for EVERY file:

- [ ] **Injection**: SQL, command, template, header injection
- [ ] **XSS**: All outputs properly escaped?
- [ ] **Authentication**: Auth checks on all protected operations?
- [ ] **Authorization/IDOR**: Access control verified, not just auth?
- [ ] **CSRF**: State-changing operations protected?
- [ ] **Race conditions**: TOCTOU in any read-then-write patterns?
- [ ] **Session**: Fixation, expiration, secure flags?
- [ ] **Cryptography**: Secure random, proper algorithms, no secrets in logs?
- [ ] **Information disclosure**: Error messages, logs, timing attacks?
- [ ] **DoS**: Unbounded operations, missing rate limits, resource exhaustion?
- [ ] **Business logic**: Edge cases, state machine violations, numeric overflow?

### Phase 4: Verification

For each potential issue:

- Check if it's already handled elsewhere in the changed code
- Search for existing tests covering the scenario
- Read surrounding context to verify the issue is real

### Phase 5: Pre-Conclusion Audit

Before finalizing:

1. List every file reviewed — confirm complete reading
2. List every checklist item — note issues found or confirmed clean
3. List any areas that could NOT be fully verified and why
4. Only then provide final findings

## Output Format

**Priority**: security vulnerabilities > bugs > code quality

**Skip**: stylistic/formatting issues

For each issue:

- **File:Line** — Brief description
- **Severity**: Critical / High / Medium / Low
- **Problem**: What's wrong
- **Evidence**: Why this is real (not already fixed, no existing test, etc.)
- **Fix**: Concrete suggestion
- **References**: OWASP, RFCs, or other standards if applicable

If nothing significant is found, say so — don't invent issues.

Report findings only. Do not make changes unless asked.
