---
name: ci-monitor
description: Use this skill after pushing commits or when asked about CI status or to fix failing tests. It monitors GitHub Actions workflow runs for the current branch, waits for completion, returns which checks passed or failed with error details, and provides a methodology for iterating until all checks pass.
allowed-tools:
  - bash
---

## Checking CI Status

- Use the `list_workflow_runs` tool to check CI status for the current branch/PR.
- Wait for ALL in-progress runs to complete before reporting status. Never claim tests pass without actually checking.
- For each workflow, report: passed, failed, or still running.
- For failed workflows, pull the relevant log section showing the error.

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
- Never assume tests pass without checking. Hallucinating test results is the worst failure mode.
- If CI still fails after 5 fix-push cycles, stop and escalate to the user with a summary of what you tried and what you observed.
- If a failure is ambiguous, ask the user rather than guessing.
- Default to autonomous action. Escalate only when the correct path is genuinely unclear.
