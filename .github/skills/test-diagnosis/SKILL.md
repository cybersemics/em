---
name: test-diagnosis
description: Use this skill when a test run has failed — a CI check, or a suite run locally. It analyzes the failure output, identifies the specific failing test or build step, categorizes the failure type, and provides guidance on how to fix it. In CI, use in combination with the CI Monitor skill.
allowed-tools:
  - bash
---

## Diagnosing Failures

When a run fails:

1. Get the failure output. In CI, pull the logs for the failed step — `ci-monitor` reports which one. Running locally, read the runner output directly.
2. Identify the specific failure: which test, what assertion, what error message.
3. Categorize the failure as one of:
   - **Build error** — compilation or bundling failed.
   - **Lint/format error** — code style violation.
   - **Unit test failure** — a test assertion failed.
   - **Snapshot mismatch** — visual or structural snapshot doesn't match.
   - **Timeout** — test hung or took too long. Could be infrastructure or a deadlock.
   - **Flaky test** — check against known flaky tests (see below).
4. Attribute the failure before you change anything (see below).

## Attribute the Failure

A failing check on a pull request is not necessarily the pull request's fault. Decide which of these it is, from evidence, and handle each differently:

- **Caused by this pull request** — `main` passes it, and it either fails in code or tests this branch touched or fails again on an unchanged re-run of this branch's head. Fix it in this pull request; that is what the rest of this skill is for.
- **Fails consistently on `main`** — the same test or step fails on `main`'s recent runs of the same workflow too. It is a blocker, not this pull request's work. Do not fix it here. Cite the open `main-fix` issue that [Main Fix](../../../docs/testing.md#failing-ci-on-main) files; if there is none, report the failing `main` runs to the user rather than filing a `main-fix` issue by hand, since an open one stops Main Fix from starting its own fix task. Report the check as blocked, and merge `main` in only once the fix has landed there.
- **Flaky on `main`** — `main` passes it most of the time, it failed here in code this pull request does not touch, and it is either tracked as flaky or has failed intermittently on `main` before. Re-run the failed job once, unchanged, and cite the evidence (the failing run, the passing `main` runs, any tracking issue). Do not change code or tests to make it pass here. If no open issue labelled `test` tracks it, file one titled `Flaky test: <file> > <full name>` with `create-issue`, or report it to the user if you cannot.

When a failure is consistent or flaky on `main` and still red after that one re-run, stop the fix loop and escalate with the evidence and the tracking issue; that is a legitimate ending in `end-session`, not a reason to keep pushing.

The evidence is `main`'s own runs: list the failing workflow's runs with `branch: "main"` and `event: "push"`, and read the logs of any that failed. A request to "address" or "fix" a failing check asks you to diagnose it and act on that diagnosis. It does not widen the pull request's scope: a fix for a failure the pull request did not cause belongs in its own pull request, and your reply should say which of the three the failure was.

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
- If you suspect a test is flaky but it's not in the list, track it as [Attribute the Failure](#attribute-the-failure) describes rather than fixing it in this pull request.
- If the same test fails inconsistently across fix-push cycles, it's likely flaky.

## When to Escalate

- After 3 failed attempts to fix the same test.
- When the failure category is ambiguous.
- When you're unsure if a snapshot change is intentional.
- When a test appears flaky but isn't in the known list and you cannot file a tracking issue.
- When a failure the pull request did not cause blocks it from merging.
