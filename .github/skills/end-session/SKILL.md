---
name: end-session
description: >-
  ALWAYS USE THIS SKILL before ending a session, yielding your turn, or
  escalating to the user. A step-by-step exit checklist: documentation still
  true, nothing uncommitted, nothing unpushed, no test left skipped, CI green,
  and a report the user can act on.
allowed-tools:
  - bash
---

This is the **End Session** skill. It runs at the other end of the work from `issue-repro` and `plan`: those two gate you *into* implementation, this one gates you *out* of the session. Work through it step by step, in order, every time you are about to stop — whether you are stopping because the work is done or because you are escalating.

The reason this skill exists: an agent's last action is the one no one supervises. A session that ends with an uncommitted fix on a disposable runner has destroyed the work, not delivered it — the branch looks untouched and the effort is unrecoverable. A session that ends while CI is still running has reported a result it never observed. Both look like success from inside the transcript. This checklist is the thing that makes the ending honest.

---

## Step 0: Are you allowed to end the turn at all?

Check this **before** the rest of the checklist, because most of the time the correct action is not to tidy up — it is to keep working.

You may **not** end your turn if any of these is true:

- You have just emitted a gate confirmation line (`issue-repro: …` or `plan: …`). Those lines are explicitly **not** stopping points — continue in the same turn.
- You are mid-way through `issue-repro`, `plan`, or the fix-validate loop, and have not hit the 5-attempt limit.
- CI runs are still in progress. Wait for them with `ci-monitor`. "I'll report the runs that finished" is not an ending.
- You are about to describe work as complete without having watched a check confirm it.

There is no human waiting to unblock you mid-task — stopping to ask for permission you were already given is the same as abandoning the work. **Default to continuing.** Only these are legitimate endings:

1. The work is complete and every CI check is green.
2. You have hit a documented limit — 5 fix-push cycles, or 5 fix-validate attempts — and are escalating.
3. You cannot reproduce the issue (`issue-repro` Step 3), and are escalating.
4. The correct path is genuinely ambiguous and proceeding either way risks the wrong outcome.

Endings 2–4 still run the whole checklist below. **An escalation is an ending, not an exemption** — that is precisely when unpushed work is most likely to be lost, because you are stopping in the middle rather than at a natural finish.

---

## Step 1: Does the documentation still describe reality?

**Execute the `docs-sync` skill.** It routes the files you changed to the documents that describe them and repairs whatever your change made untrue.

This comes first because a doc edit is itself a file change — it has to happen before you take stock of the tree, not after, or it misses the commit. It is also the step most easily rationalised away at the end of a long session, which is exactly why it is a numbered step rather than a good intention.

`docs/` is required reading for the `plan` skill, so a stale document does not merely misinform a human — it becomes the input to the next agent's plan. A change that leaves documentation behind makes every later session start from a worse map.

`docs: unaffected — <reason>` is a legitimate outcome, but it is a conclusion you reach after checking, not a default. Carry whichever line `docs-sync` hands back into your Step 7 report.

---

## Step 2: Account for every changed file

Nothing you did survives unless it is committed and pushed. Start here, before CI, because committing changes CI.

```bash
git status --porcelain
```

Go through **every** line it prints and put each file in one of three buckets:

- **Part of the work** → commit it (see Step 3).
- **Scratch** — a debug script, a screenshot, a log you dumped mid-investigation → delete it.
- **Not yours** — a change you do not recognise and did not make → **do not delete it and do not commit it.** Leave it and say so in your report. Discarding someone else's uncommitted work is unrecoverable, and a stale file you cannot explain is information the user needs.

Never blanket-stage with `git add -A` without reading that list first. Never use `git checkout .`, `git restore .`, or `git clean -fd` to make the output empty — that destroys work rather than accounting for it.

---

## Step 3: Commit and push everything

```bash
yarn prettier --write .   # no pre-commit hook exists; unformatted source fails `yarn lint` in CI
git add <the files from Step 2>
git commit -m "<clear, specific message>"
git push
git status --porcelain    # must now print nothing
git log --oneline @{u}..HEAD   # must now print nothing
```

- `git status --porcelain` printing nothing means nothing is uncommitted. `git log @{u}..HEAD` printing nothing means nothing is unpushed. **Both must be empty before you may end.** A committed-but-unpushed branch on an ephemeral runner is exactly as lost as an uncommitted one.
- If `@{u}..HEAD` errors with "no upstream configured", the branch has never been pushed at all — `git push -u origin HEAD`.
- Split logically separate changes into atomic commits rather than one catch-all. If the escalation means the work is half-finished, commit it anyway and describe its state in the message — a half-finished pushed branch is recoverable, a lost one is not.
- Never push to `main` or a protected branch.

---

## Step 4: No test left skipped

A regression test committed `it.skip` is a transient safety marker, not a deliverable. Merged skipped, it provides zero protection while looking like coverage.

```bash
git diff origin/main...HEAD -- '*.ts' '*.tsx' | grep -nE '^\+.*\b(it|describe)\.skip\b'
```

Any hit is a test **this branch** added or left skipped. If it is the regression test from `issue-repro` Step 4 and the fix is in, remove the `.skip`, re-run it via `run-test` to confirm it now passes, and commit that with the fix (back to Step 3).

The one legitimate exit with a `.skip` still present is an escalation where the fix was never implemented — the skipped test is the useful artifact of a failed session. Say so explicitly in your report.

---

## Step 5: CI is green — all of it

Use `ci-monitor`. Wait for every run on the branch to complete; do not report on a partial set.

- **Read which check failed.** A red `TDD` check and a red normal suite mean opposite things. `tdd.yml` un-skips your new test on the base branch and *expects it to fail*, so a red TDD check usually means the test wrongly **passes** on base — it does not capture the bug. A red normal suite means the code is broken. "CI failed" alone is not a diagnosis.
- If anything is red, this is not an ending. Diagnose with `test-diagnosis`, fix, and return to Step 3 — pushing restarts CI and restarts this checklist. Stop only at 5 fix-push cycles, and then as an escalation.
- Never claim checks pass without having seen them pass. Hallucinated test results are the worst failure mode available to you.

---

## Step 6: The pull request is in order

- A draft PR exists for the branch. On Copilot, create it with the `runtime-tools-create_pull_request` tool — do not shell out to `git` or `gh` to open one. In a local harness, where that tool does not exist, `gh pr create --draft` is the equivalent.
- Its description starts with the issue reference — `Fixes #1234` when merging the PR resolves the issue (GitHub links it in the sidebar's Development section and closes it on merge), or the bare `#1234` when the issue stays open — with the architectural plan from the `plan` skill below it.
- Its title and summary describe what actually landed — not what you set out to do three fixes ago.
- **Every section earns its place.** Say each thing once: a reviewer-notes section that restates the summary is noise, and so is a consequence the reader already drew — "no behaviour change" after you explained the code was unreachable, "no references in `docs/`" after you called it dead code. Cut the section rather than pad it.
- **Never state that tests pass.** GitHub renders the CI status on the PR itself; asserting it in prose adds nothing and goes stale the next time you push.

---

## Step 7: Report

Your final message is the entire record for whoever picks this up. It must contain:

- **What you did**, step by step — branch created, commits made, PR opened, CI status, fixes applied.
- **The PR URL and its status.**
- **The `docs:` line from Step 1** — either the documents you updated, or `docs: unaffected — <reason>`.
- **A concise diagnosis of any CI failure** you hit along the way, and what you did about it.
- **What you did not do.** Anything out of scope, deferred, or left broken. A test still skipped, a file you left alone in Step 2, a second reproduction path you did not get to. Silence here reads as "everything is handled."
- **If escalating:** what you tried, what you observed each time, and the specific question or decision you need from the user. "It didn't work" is not an escalation.

---

## Confirmation

When — and only when — every step above has been satisfied, output exactly one of these lines, verbatim, on its own line, as the last line of your turn:

```
end-session: complete — checklist passed per .github/skills/end-session/SKILL.md.
```

```
end-session: escalating — checklist passed per .github/skills/end-session/SKILL.md; blocked on <one-line reason>.
```

Unlike the `issue-repro` and `plan` gate lines, this one **is** a stopping point — it is the only one. Emitting it is your assertion that the tree is clean, the branch is pushed, and CI was observed green (or that you are escalating with everything preserved). Do not emit it speculatively and then keep working.

---

## Failure modes to avoid

- **Tidying instead of finishing.** Running this checklist as an excuse to stop mid-task. Step 0 exists to catch that — if you are not at a legitimate ending, the checklist is not what you should be doing.
- **Cleaning the tree by deleting.** `git checkout .` makes Step 3's command print nothing and destroys the session's work doing it. Account for files; never discard them.
- **Escalating without pushing.** The most expensive ending available: the investigation is gone and the user restarts from zero. Escalation runs the full checklist.
- **Reporting CI you did not watch.** Ending while runs are in flight and describing the ones that happened to finish.
