---
name: ci-monitor
description: Use this skill after pushing commits or when asked about CI status or to fix failing tests. It monitors GitHub Actions workflow runs for the current branch, waits for completion, returns which checks passed or failed with error details, and provides a methodology for iterating until all checks pass.
allowed-tools:
  - bash
---

## Checking CI Status

- List workflow runs with the GitHub MCP **actions** tool: call `github-mcp-server-actions_list` with `method: "list_workflow_runs"`. The standalone `list_workflow_runs` tool no longer exists.
- Target the repository you are working in (`owner`/`repo` — derive them from `git remote get-url origin`; do not hardcode `cybersemics`) and filter by **your current branch**, which you get from `git rev-parse --abbrev-ref HEAD`. Do **not** restrict by `status` — you need in-progress runs to stay visible so you can wait for them, and you want every run on the branch, not just `main`.

  ```json
  {
    "method": "list_workflow_runs",
    "owner": "<repo owner>",
    "repo": "<repo name>",
    "workflow_runs_filter": { "branch": "<your current branch>" }
  }
  ```

- **In a local harness**, where that MCP server is not present, the `gh` CLI is the equivalent: `gh run list --branch "$(git rev-parse --abbrev-ref HEAD)"` to list, and `gh run view <id> --log-failed` to pull the failing log. Everything below applies unchanged — only the mechanism differs.
- Wait for ALL in-progress runs to complete before reporting status. Never claim tests pass without actually checking.
- **A `cancelled` run is not a failure.** Test, Puppeteer, Lint, and Vercel Preview cancel a run as soon as a newer push supersedes it (`docs/testing.md` § Superseded runs), so a branch that was pushed to twice in quick succession normally carries cancelled runs on the older commits. Judge each workflow by its run on the current head sha (`git rev-parse HEAD`), and never enter the iteration loop below for a run that was merely superseded.
- For each workflow, report: passed, failed, or still running.
- For failed workflows, pull the relevant log section showing the error.

## Waiting Without Fooling Yourself

Polling CI means writing a loop that decides when to stop. Get that condition wrong and the loop reports success it never observed — the same hallucinated-results failure mode as not checking at all, just harder to notice.

- **Stop on a positive signal, never on the absence of one.** A loop that exits when the output _lacks_ a token — no `pending`, no `in_progress`, no `failure` — treats every error as completion. A network timeout, an expired token, a rate limit, or a typo'd PR number all print something with no `pending` in it, and the loop exits declaring CI green. Anything you did not positively recognize is _not_ a conclusion; keep waiting.
- **Branch on exit codes, which distinguish the cases.** `gh pr checks` exits `0` when every check passed and `8` while any is still pending (`gh pr checks --help`, "Additional exit codes"). Treat any other code as transient and retry rather than concluding. Note that `1` means a check failed _or_ `gh` itself errored — auth, a bad PR number — so it is safe to stop on but must be confirmed by reading the output rather than reported as a test failure on its own:

  ```bash
  for i in $(seq 1 80); do
    out=$(gh pr checks "$PR" 2>&1); rc=$?
    [ $rc -eq 0 ] && { echo "PASSED"; printf '%s\n' "$out"; exit 0; }
    [ $rc -eq 1 ] && { echo "FAILED"; printf '%s\n' "$out"; exit 1; }
    sleep 30  # 8 = still pending; any other code = transient, retry
  done
  echo "TIMEOUT"; exit 2
  ```

  `gh run watch <id> --exit-status` is a reasonable alternative for a single run, but it still needs a bounded retry around it — it exits nonzero on a dropped connection just as it does on a failing run.

- **Always bound the loop and treat the timeout as its own outcome.** A wait that ends because it ran out of attempts has observed nothing; report it as "still pending after N minutes", never as a result.
- **Re-query once before acting on what the loop said.** Before merging, reporting green, or moving on, run the status check one more time in the foreground and read it yourself. This is the step that catches a wait that exited for the wrong reason, and it costs one API call.
- The same rule governs the MCP path: an empty `workflow_runs` array or an errored response means you did not observe the runs, not that they finished.

## Iteration Loop

When CI checks fail, follow this loop:

1. Use the Test Failure Diagnosis skill to identify and categorize the failure.
2. Fix the issue based on the diagnosis.
3. Push the fix to the branch.
4. Wait for all CI runs to complete again using this skill.
5. If all checks pass, you're done. Summarize what you did.
6. If checks still fail, return to step 1.

IMPORTANT:

- Never skip this loop. Always verify checks pass before claiming success.
- Never assume tests pass without checking. Hallucinating test results is the worst failure mode — and a poll loop that exits on the absence of a token is a way of doing it accidentally, so hold every wait to the rules in [Waiting Without Fooling Yourself](#waiting-without-fooling-yourself).
- If CI still fails after 5 fix-push cycles, stop and escalate to the user with a summary of what you tried and what you observed.
- If a failure is ambiguous, ask the user rather than guessing.
- Default to autonomous action. Escalate only when the correct path is genuinely unclear.
