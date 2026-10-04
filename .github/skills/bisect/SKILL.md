---
name: bisect
description: >-
  ALWAYS USE THIS SKILL when asked to bisect a bug, or to find out whether a
  reported bug is a recent regression or has always existed. Takes a GitHub
  issue number or URL whose issue has exact Steps to Reproduce, drives git
  bisect by hand — reproducing the bug at each commit on whatever platform it
  lives on — and reports the commit and pull request that introduced it, or
  that it predates the last year.
allowed-tools:
  - bash
  - chrome-devtools
  - wdio
---

This skill answers one question: **did this bug used to work?** If it did, it names the commit — and the pull request — that broke it. If it did not, it says so.

It does **not** explain the bug. Do not read the bad commit's diff to form a theory, do not speculate about why it broke, and do not attempt a fix. A separate agent takes the verdict from here. A bisect that ends in a confident guess about the cause has done two jobs, the second of them badly, and the guess will anchor whoever reads it.

`git bisect run` is not enough on its own. The bug may be a failing test, but it may as easily be a misplaced caret on iOS, a colour, or a gesture that only sometimes misfires — anything an agent can watch happen. So the agent is the oracle: at each commit it reproduces the steps and tells `git bisect` what it saw. The only requirement is that **you** can reproduce the bug consistently at the current tip of `main`.

## Stages

1. **Parse** — read the issue and extract the steps, the failure, and the platform.
2. **Prepare a tree** — a checkout that can move through history without touching anyone's work.
3. **Baseline** — reproduce at the tip of `main`, and measure how reliably it reproduces.
4. **Find a good commit** — 30 days back, then a year back, then give up.
5. **Bisect** — reproduce at each commit `git bisect` hands you, and record the verdict.
6. **Confirm** — the bad commit is bad and its parent is good.
7. **Report** — the verdict, the commit, the pull request.
8. **Clean up.**

---

## Step 1: Parse the issue

Accept an issue number (`5812`) or URL (`https://github.com/cybersemics/em/issues/5812`), and read the issue and its comments:

```bash
gh issue view <number> --repo cybersemics/em --comments
```

Extract **Steps to Reproduce**, **Current Behavior**, and **Expected Behavior**, matching headings loosely as the `create-issue` format varies ("Steps to Reproduce", "How to reproduce", "Actual Behavior").

**The issue must contain exact steps to reproduce.** If it has none, or they are too vague to follow without inventing steps ("sometimes the cursor jumps"), stop and say so. Do not fill the gaps yourself: a bisect is only as good as its oracle, and steps you invented test your guess about the bug rather than the bug. Point the user at `create-issue` for adding steps.

Determine the platform — `web`, `android`, or `ios` — using the table in [`reproduce`](../reproduce/SKILL.md) Step 1, and the vehicle the bug lives in:

| The bug is… | Reproduce it with |
| --- | --- |
| A failing test named in the issue | That test, run in its harness (`run-test` on Copilot; `yarn test <file>` for unit tests, `yarn test:puppeteer <file>` for Puppeteer) |
| Behaviour or appearance in the app | The app, driven through `browser-control` on Copilot, or whatever browser, simulator, or device tooling your harness has locally |

### iOS

The iOS app on BrowserStack is a shell that loads the dev server, as is a server-mode build of `ios/App` — so on either, swapping the commit behind the dev server swaps the code under test, and the native app is built only once. Safari on iOS and the Capacitor app scroll differently with the keyboard up (the app runs the keyboard plugin with `resize: 'none'`), so reproduce in whichever one the issue names, and try the app before giving up if it names neither.

Some iOS behaviour is not available everywhere:

- **Autocorrect** is switched off on BrowserStack's shared devices and cannot be enabled. A local iOS Simulator has it, but off by default: turn on Settings → General → Keyboard → Auto-Correction and Predictive Text, and turn off the hardware keyboard (`defaults write com.apple.iphonesimulator ConnectHardwareKeyboard -bool false`, before boot) so the on-screen keyboard is what types. Tap its keys rather than sending text, or autocorrect never sees the word. Then confirm a correction actually happened in every trial: the iOS 27.0 Simulator shows both settings on yet offers no suggestions and corrects nothing, and a trial in which autocorrect never fired is not a clean trial — it tested nothing.
- **The Simulator is not a device.** Some behaviour reproduces only on hardware — see [Cursor and Caret](../../../docs/cursor-and-caret.md). If a bug needs both autocorrect and real hardware, no environment here has both: stop and report that, rather than bisecting an environment where the bug does not happen.

For the app in a local Simulator: `CAPACITOR_SERVER_URL=http://localhost:<port> BUILD_MODE=server NODE_ENV=development npx cap sync ios`, then build `ios/App/App.xcworkspace` for the simulator with `xcodebuild` and install it with `xcrun simctl install`. A debug build's web view is inspectable, so Appium (installed into a scratch directory with its `xcuitest` driver) can attach to it to seed thoughts through `window.em.testHelpers` and read scroll positions, while native taps drive the keyboard.

---

## Step 2: Prepare a tree

Bisecting checks out old commits, so it must never happen in a tree holding someone's work.

- **On a disposable runner** (Copilot, a Claude Code cloud session): commit or set aside your own changes, then bisect in the checkout itself. `browser-control` probes the dev server on port 3000, and the iOS app on BrowserStack loads whatever that dev server serves, so the tree under test has to be the one served there.
- **On a developer's machine:** never bisect in their checkout. Create a detached worktree outside the repository and work there:

  ```bash
  git fetch origin main
  git worktree add --detach <scratch>/em-bisect origin/main
  ```

  Serve it on a free port rather than 3000, which is likely theirs.

Every commit under test needs its own dependencies and its own dev server. At each one:

```bash
rm -rf styled-system packages/webview/dist   # generated output from the previous commit
yarn install
yarn run postinstall    # builds packages/webview and the styles
yarn start              # or: yarn vite --host --port <port>
```

Do all of it at every commit. `yarn install` skips `postinstall` when the dependencies did not change, and the style and package builds each skip themselves when their stamp says they are up to date, so without the deletion a commit is served with generated files from a different commit. That fails loudly at best — an older commit importing `styled-system/tokens/index.mjs` that a newer codegen no longer emits — and silently at worst. Then **restart the dev server**. Vite's hot reload does not survive a jump of hundreds of commits — config, plugins, and dependencies change underneath it — and a page served by the previous commit's server produces a verdict about the wrong commit, silently. Reload the page or relaunch the app afterwards, and start each trial from a fresh app state (`localStorage.clear(); location.reload();`, or a fresh session).

If the bug is a test that did not exist at an older commit, copy the test file from the tip of `main` into the tree under test, untracked, for each trial. If it depends on helpers that did not exist then either, that commit is untestable — see [Untestable commits](#untestable-commits).

---

## Step 3: Baseline at the tip of `main`

Reproduce the bug at `origin/main` before going anywhere else. If it does not reproduce there, there is nothing to bisect — it may already be fixed, the steps may be incomplete, or the bug may need an environment you do not have. Check one of those cheaply before stopping: reproduce at the last commit on `main` before the issue was filed. If it reproduces there, `main` has fixed it; if not, the environment or the steps are the gap. Report which, and name every environment you tried.

While you are here, **measure how reliably it reproduces**: follow the steps from a fresh state **5 times** and count the failures. That rate decides how many trials every later verdict needs.

| Baseline | Kind | Trials per commit |
| --- | --- | --- |
| 5 of 5 | Deterministic | **Bad**: the first trial that reproduces it. **Good**: 2 clean trials. |
| 1–4 of 5 | Nondeterministic | **Bad**: any trial that reproduces it. **Good**: *N* clean trials, with *N* from the rate below. |
| 0 of 5 | — | Stop: not reproducible. |

For a nondeterministic bug that reproduces with probability *p*, a commit that is really bad passes *N* clean trials with probability (1 − *p*)ᴺ. Choose *N* so that falls under 5%: 2 trials at 4 of 5, 4 trials at 3 of 5, 6 trials at 2 of 5, 14 trials at 1 of 5. Reproduction is evidence; its absence is only evidence after enough trials. A verdict of **bad** never needs more than one sighting of the failure, as long as it is the failure the issue describes and not some other one.

Write down exactly what you did at the baseline — the steps, the helpers or commands, what the failure looked like. Every later trial repeats that procedure unchanged. A procedure that drifts between commits makes the oracle, not the code, the variable.

---

## Step 4: Find a good commit

Bisection needs a commit where the bug does not happen. Look for one in two jumps.

**30 days back.** The last commit on `main` before then:

```bash
git rev-list -1 --first-parent --before="30 days ago" origin/main
```

Test it. If it is **good**, bisect between it and `origin/main`.

**A year back**, only if 30 days back was **bad**:

```bash
git rev-list -1 --first-parent --before="1 year ago" origin/main
```

If it is **good**, bisect between it and the 30-day commit — that commit is already known bad, which saves a step or two.

If the year-old commit is **bad** too, **stop**. The bug has existed for at least a year; treat it as having always been broken, report that, and do not go further back. Older history is costlier to build and run, and a regression older than a year is not one anybody will revert.

If a boundary commit is untestable — it does not build, or the feature the steps use did not exist yet — try the nearest testable commit after it on `main` (`git rev-list --first-parent --reverse <boundary>..origin/main | head`). If the feature itself is younger than the window, the bug cannot predate the feature: use the earliest commit where the steps can be followed.

---

## Step 5: Bisect

```bash
git bisect start --first-parent <bad> <good>
```

`--first-parent` keeps the search on `main`'s own history. Pull requests here are squash-merged, so each commit on that line is one pull request — which is the unit the report needs, and it keeps the search away from intermediate commits on merged branches that were never meant to work.

At each commit `git bisect` checks out:

1. Install and restart the dev server (Step 2).
2. Run the baseline procedure as many times as Step 3 says.
3. Record the verdict:

   ```bash
   git bisect good    # the failure did not appear in the required number of clean trials
   git bisect bad     # the failure the issue describes appeared
   git bisect skip    # this commit cannot be tested — see below
   ```

4. Note the commit, the verdict, and one line of evidence — "caret at offset 0, expected 4", "0 of 4 trials" — in a log file in your scratch directory. It is the record that lets someone check a surprising verdict later without rerunning the whole bisect.

There are about 300 commits on `main` in a month and 1500 in a year, so expect around 9 steps for the 30-day window and 11 for the year.

### Untestable commits

`git bisect skip` a commit that fails to install or build, crashes before the steps can start, or lacks something the steps depend on. **Do not mark an untestable commit good or bad.** A commit that does not start is not good because the bug is absent, and not bad because something is broken — a different failure is not the reported failure. If `git bisect` ends with a range of skipped commits instead of one, report that range.

### Things that go wrong

- **A verdict from the wrong commit.** The dev server was not restarted, or the install was skipped, so the page shows the previous commit's code. Restart every time.
- **A different bug.** An old commit fails in some other way and gets marked bad. Only the failure in **Current Behavior** counts; anything else is either good (if the steps complete and the expected behaviour holds) or untestable.
- **A drifting procedure.** Taking a shortcut at commit 6 that you did not take at the baseline. Repeat the same procedure every time.
- **Too few trials.** A nondeterministic bug marked good after one clean run. Use the trial count from Step 3.

---

## Step 6: Confirm

When `git bisect` names the first bad commit, check the edge it found before trusting it:

1. **The bad commit is bad.** Check it out and reproduce the failure again.
2. **Its parent on `main` is good.** Check out `<bad>^` (the first parent) and run **twice** the good-trial count from Step 3.

Both must hold. If the parent is **also bad**, the bisect went wrong somewhere: a verdict along the way was mistaken, or the bug reproduces less consistently than the baseline measured. Do not report the commit as the culprit. Report the result as **inconclusive**, with the bisect log, so the next step can be rerunning with more trials rather than chasing a commit that is not the cause.

---

## Step 7: Report

The report is one of four verdicts, and nothing more — no theory about why.

| Verdict | When |
| --- | --- |
| **Regression** | A bad commit was found and Step 6 confirmed it |
| **Not a recent regression** | The commit from a year ago is bad |
| **Inconclusive** | Step 6 failed, or the bisect ended on a range of skipped commits |
| **Not reproducible** | The bug does not reproduce at the tip of `main` (Step 3) |

For a regression, find the pull request. Squash-merged commits name it in the subject — `Fix caret on delete (#5789)` — and GitHub can be asked when the subject does not:

```bash
gh api repos/cybersemics/em/commits/<sha>/pulls --jq '.[] | "\(.number) \(.html_url)"'
```

Link the pull request only when the regression was confirmed in Step 6. An inconclusive bisect names no pull request, because a link reads as an accusation however it is worded.

Include:

- The verdict.
- For a regression: the commit hash, its subject and date, and the pull request URL.
- The good and bad boundaries that were bisected, and how many commits were tested.
- The baseline reproduction rate and the trial count used.
- The bisect log, or its path.

Report to the user. Do not comment on the issue or the pull request unless asked — a bisect verdict posted on someone's pull request is outward-facing, and the user decides where it goes.

---

## Step 8: Clean up

```bash
git bisect reset
```

Stop every dev server the bisect started. On a developer's machine, remove the worktree (`git worktree remove <scratch>/em-bisect`). On a disposable runner, return to the branch you started on and restore anything you set aside in Step 2.

---

## Escalation Rules

- No exact Steps to Reproduce in the issue: stop before bisecting.
- Does not reproduce at the tip of `main` after 5 trials: stop and report **not reproducible**.
- Every commit in the window is untestable, or the tree cannot be built at either boundary: stop and report what failed.
- Otherwise, default to autonomous action. A bisect is long and mechanical; finish it and report the verdict rather than checking in at each step.
