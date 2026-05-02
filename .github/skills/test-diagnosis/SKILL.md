---
name: test-diagnosis
description: Use this skill when CI checks have failed. It analyzes the failure logs, identifies the specific failing test or build step, categorizes the failure type, and provides guidance on how to fix it. Use in combination with the CI Monitor skill.
allowed-tools:
  - bash
---

## Diagnosing Failures

When a CI run fails:

1. Pull the logs for the failed step.
2. Identify the specific failure: which test, what assertion, what error message.
3. Categorize the failure as one of:
   - **Build error** — compilation or bundling failed.
   - **Lint/format error** — code style violation.
   - **Unit test failure** — a test assertion failed.
   - **Snapshot mismatch** — visual or structural snapshot doesn't match.
   - **Timeout** — test hung or took too long. Could be infrastructure or a deadlock.
   - **Flaky test** — check against known flaky tests (see below).

## Fix Priority Order

Address failures in this order. Don't attempt later categories until earlier ones pass:

1. Build errors (nothing else matters if it doesn't build)
2. Lint/format errors (quick mechanical fixes)
3. Unit test failures (investigate root cause)
4. Snapshot mismatches (only update if change was intentional)

## Fix Rules

### Unit test failures

- Fix the code, not the test, unless you are certain the test itself is wrong.
- Never modify a test just to make it pass without understanding the root cause.

### Lint/format errors

- Apply the required fixes and recommit. These are mechanical.

### Snapshot failures

- Only use the `puppeteer-update-snapshots` skill if the UI change was explicitly requested by the user and matches what they asked for.
- NEVER update snapshots to make a failing test pass without understanding why the snapshot changed.
- If unsure whether a snapshot change is intentional, ask the user.

### Timeouts

- Check if the test works locally or in isolation before assuming it's a code problem.
- Could be infrastructure (Docker/Browserless startup), an infinite loop, or a deadlock.

### Flaky tests

- Check `cybersemics/em`'s open GitHub issues with label "test" for known flaky tests.
- If the failing test is in that list, note it and move on to other failures.
- If you suspect a test is flaky but it's not in the list, stop and tell the user.
- If the same test fails inconsistently across fix-push cycles, it's likely flaky.

## When to Escalate

- After 3 failed attempts to fix the same test.
- When the failure category is ambiguous.
- When you're unsure if a snapshot change is intentional.
- When a test appears flaky but isn't in the known list.
