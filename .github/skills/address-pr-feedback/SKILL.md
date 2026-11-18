---
name: address-pr-feedback
description: >-
  ALWAYS USE THIS SKILL when asked to work on feedback left as a comment on a pull request in this repo — a tester's report of a regression, new Steps to Reproduce, a reviewer's request, or "fix the issue in this comment". Covers reading the comment and its attachments, reproducing it, fixing it on top of the pull request, and replying on the pull request with what was found and done.
allowed-tools:
  - bash
---

Feedback on a pull request comes from someone who is waiting on it: a tester who filed a report, or a maintainer who handed it on. They see none of your work until something appears on the pull request. A fix pushed silently leaves them to work out from a diff which report it answers, whether the other reports were looked at, and what still needs testing on a device. So every piece of feedback you take up gets a reply on the pull request saying what you did with it.

## 1. Read everything the comment refers to

- Read the comment itself, the pull request's description, the linked issue, and the rest of the thread. A later comment often reframes an earlier one: a maintainer may already have split a point into its own issue, declared it by design, or confirmed that another point is fixed. Do not redo work the thread has already settled.
- Take the Steps to Reproduce, Current Behavior and Expected Behavior from the comment as written. If the comment says the issue's steps were updated, read the issue again rather than relying on an earlier copy.
- Watch any video. GitHub's `user-attachments` URLs cannot be fetched from a cloud session, so ask the user to upload the file if you cannot reach it. Then extract frames with `ffmpeg` (`fps=2`, tiled into contact sheets) and look at them. A video shows the timing and order of events, which the text usually leaves out, and whether the bug happened on every attempt or only some.

## 2. Reproduce before fixing

Follow the [`reproduce`](../reproduce/SKILL.md) skill. Two points are specific to pull request feedback:

- **Test the pull request's base as well as its head.** A tester's "not reproducible on `main`" is one observation of what may be an intermittent bug. Before you treat a report as a regression the pull request introduced, run the same steps on the base commit. If the base fails the same way, say so in your reply. The fix may still belong on the pull request, but the reply must not describe it as a regression.
- **Isolate each cause.** When a report could have two causes, vary one condition at a time until each is shown on its own, and fix each.

## 3. Fix on top of the pull request

- Branch from the pull request's head, so the fix is tested together with the change it builds on.
- Push to the pull request's own branch only with the user's go-ahead. Otherwise push to your session branch and say in your reply where the commits are.
- Capture each fixed behavior in a test that fails without the fix and passes with it ([`tdd-write-failing-test`](../tdd-write-failing-test/SKILL.md)), and keep the docs true ([`docs-sync`](../docs-sync/SKILL.md)).

## 4. Reply on the pull request

Post a reply as soon as you have something to report, and a follow-up when the picture changes. Do not wait until everything is finished. Write it as a pull request comment that quotes or names the report it answers, with one section per report:

- **What you found.** The cause in a sentence or two, in terms the tester can check against what they saw, such as "the page jumps to the cursor while the thought is still held". Give the evidence: what reproduced it and on which commit, including the base when that matters.
- **What you changed.** One or two sentences per fix, with the commit hash written bare. GitHub links a bare hash and does not link one in backticks or a code block (AGENTS.md).
- **How it was verified.** Name each test and whether it fails without the fix. Say plainly what was *not* verified, especially "not tested on a real iPhone" when the fix is for iOS and only emulation was available. The tester uses this to decide what to retest.
- **What is still open.** Anything you could not reproduce or explain, and what would settle it, such as "a Debug Log from a run where the jump happens". A reply that claims more than you observed costs the tester another round.

Mark each claim as verified or assumed, as the [`end-session`](../end-session/SKILL.md) report does. End the comment with the footer your harness requires for GitHub comments.

## When stuck

If the report does not reproduce, reply anyway. Say what you tried, on which commits and platforms, and ask for what would close the gap: a video, a Debug Log, the exact device and OS. Do not post a speculative fix as if it answered the report. Default to acting on your own. Ask the user only when the right path is genuinely unclear, such as whether to push to someone else's branch.
