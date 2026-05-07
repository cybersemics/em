---
name: issue-repro
description: >-
  ALWAYS USE THIS SKILL when working on an issue that has "Steps to Reproduce".
allowed-tools:
  - bash
  - chrome-devtools
  - wdio
---

If you are working on a GitHub issue that includes "Steps to Reproduce", "Current Behavior", and "Expected Behavior" sections, you must follow this step-by-step guide to confirming the bug exists and validate your fix.

Follow these instructions **directly**, while observing the methodology described to you (regarding the usage of `ci-monitor`, `test-diagnosis` and `puppeteer` skills where appropriate). DO NOT deviate from this process, skip steps, or make assumptions about the cause of the error without first attempting to reproduce it as described.

By following the documented steps in the issue, you can reliably reproduce the problem and ensure your solution works as intended without guesswork or assumptions.

## Stages

1. **Parse** — extract Steps to Reproduce, Current Behavior, Expected Behavior, and the **target platform** (web / android / ios) from the issue.
2. **Set up the browser** — pass the target platform to `browser-control`, which attaches the right MCP, applies emulation, and navigates to the dev server.
3. **Reproduce** — drive the browser MCP through the steps; confirm the failure mode fires.
4. **Fix** — root-cause and fix the code.
5. **Validate** — re-run the steps; confirm the failure is gone and the expected behavior is observed.

**You MUST** be able to reproduce the issue directly – if you cannot, **DO NOT** assume the cause without first confirming with the user.
**DO NOT explore a fix** until you have successfully reproduced the issue. **This is your priority.** If you **CANNOT FULLY REPRODUCE** the steps, **FAIL AND ESCALATE TO THE USER.**
Similarly, a fix is **not complete** until both Step 5a and Step 5b pass.

---

## Step 1: Parse the Issue

Use the GitHub MCP `get_issue` tool to read the full issue body. Extract these three sections — headings vary slightly across issues so match loosely:

| Section | Common headings |
|---|---|
| Steps to reproduce | "Steps to Reproduce", "Step to Reproduce", "How to reproduce" |
| Failure | "Current Behavior", "Current behavior", "Actual Behavior" |
| Goal | "Expected Behavior", "Expected behavior" |

If the issue body is ambiguous, read any attached comments before asking the
user for clarification. If a section is genuinely absent, stop and ask.

Sometimes, there may be multiple steps to reproduce within a single issue. If so, you must reproduce and fix each one separately, following the same process for each. Do not attempt to fix multiple reproduction paths at once.

### Determine the target platform

Pick exactly one of `web`, `android`, or `ios` — `browser-control` is going to need it in Step 2. Use issue tags first, fall back to keyword scan, default to `web`.

**Tags (primary):**

| Tag                                | Target  |
|------------------------------------|---------|
| `[iOS]`, `[Safari]`                | `ios`   |
| `[Android]`, `[Mobile]`            | `android` |
| no platform tag                    | `web`   |

`[Mobile]` without `[iOS]` is treated as `android` — that is the cheaper environment and reproduces almost all mobile-only behavior. Only switch to `ios` when the issue is explicitly about iOS Safari.

**Body keywords (fallback):**

If no tag is present, scan the title and body. If any of the iOS-specific terms below appear (and no Android-specific terms), pick `ios`:

- iOS-specific: "iPhone", "iPad", "iOS", "Safari", "WebKit", "Mobile Safari".
- Android-specific: "Android", "Chrome on mobile".
- Generic mobile (no platform commitment): "tap", "swipe", "long-press", "pinch", "on my phone", "bottom sheet", "on-screen keyboard", "virtual keyboard". These imply `android` unless paired with an iOS-specific term above.

If desktop-only language is used ("click", "hover", "right-click", no mobile hints), pick `web`.

If you cannot determine the target after this — for example, an issue mentioning both iOS and Android — stop and ask the user which platform to reproduce on. Do not guess: an iOS-only bug will not reproduce under Android emulation and vice-versa.

State the chosen target out loud before continuing, e.g. `issue-repro: target = android (issue tagged [Mobile], body mentions "swipe").`

---

## Step 2: Set Up the Browser

Hand the target platform you picked in Step 1 to the **`browser-control`** skill. It will:

1. Attach the correct MCP — `chrome-devtools` for `web`/`android`, `wdio` for `ios` — and apply mobile emulation if needed, **before any navigation**.
2. Navigate to the dev server.

Do not pick the MCP, apply emulation, or start a dev server yourself — `browser-control` owns all of that. Wait for it to confirm the environment is up before continuing.

---

## Step 3: Reproduce the Failure

The browser environment is now ready (Step 2). Use the MCP that `browser-control` selected — `chrome-devtools` for web/android targets, `wdio` for iOS.

1. **Clear app state** so you start from a clean slate. In the page console (`chrome-devtools` `evaluate_script` or `wdio` `execute_script`), run:
   ```js
   localStorage.clear(); location.reload();
   ```

2. Follow the **Steps to Reproduce** from the issue **exactly as written** —
   same order, same actions, no shortcuts. After each step, verify the UI
   reflects the expected intermediate state before continuing.

3. After the final step, check whether the **Current Behavior** described in the
   issue occurs. Observe UI state, console log messages, or any other indication as stated in the issue.

4. **Document what you observed** — quote the error message or describe the UI
   state. If the failure does not occur, **note this explicitly and do not proceed**
   **to fixing**. Instead, report to the user and ask for clarification (different
   browser, platform, version, or data state required?).

**YOU MUST ESCALATE NOW IF YOU CANNOT EXPLICITLY REPRODUCE**

### em App Interaction Reference

- For keyboard / mouse / tap / type interactions, use the tools provided by whichever MCP `browser-control` attached.
- For **swipe gestures** in the em gesture zone (notations like `rdr` or `→↓→`), use the **`interaction-gestures`** skill — it has the per-platform gesture dispatch (continuous touch with proper pacing) that the em gesture detector requires. Do not improvise gestures with raw `swipe` / `click` calls; they will not commit.
- Read **em**'s UI code to understand how to trigger certain behaviors if the steps are not explicit.

---

## Step 4: Fix the Issue

1. Use the reproduction evidence (error message, stack trace, console output) to locate the root cause. Read the relevant source code. Do not guess the cause without evidence.
2. Implement a targeted fix. Prefer the smallest change that addresses the root cause without breaking related behavior.
3. Ensure related behavior is not broken by taking a moment to analyze any potential impact of your change on the surrounding code and features. Fix any issues you identify before proceeding to validation.
4. Restart or hot-reload the app. (`yarn start` hot-reloads on file change, so a page reload is usually sufficient. For build-level changes, re-run `yarn build`.)

---

## Step 5: Fix-Validate Loop (Mandatory)

After applying a fix, validate it immediately. If validation fails, fix and
validate again. Repeat until the issue is resolved or the attempt limit is reached.

**Maximum attempts: 5.** Track the attempt count. If the issue still reproduces
after 5 fix-and-validate cycles, stop and escalate to the user with a summary
of what you tried and what you observed each time.

### Validation criteria (both must pass)

**5a — Failure no longer triggers**

1. Re-navigate to the dev server in the same browser environment `browser-control` set up. (If the session has been lost, re-run Step 2.)
2. Clear app state: `localStorage.clear(); location.reload();`
3. Follow the **Steps to Reproduce** exactly.
4. Confirm the **Current Behavior** (the bug) does **not** occur.

**5b — Expected behavior is observed**

1. In the same or a fresh tab, follow the steps again.
2. Confirm the **Expected Behavior** from the issue is observed exactly as described.

### Loop

```
attempt = 1
loop:
  fix the code (Step 4)
  run validation 5a and 5b
  if both pass → done, summarize what you changed
  if either fails → diagnose what still went wrong
  attempt += 1
  if attempt > 5 → escalate to user
```

Never claim success without completing both 5a and 5b. Never skip the loop.

---

## Escalation Rules

- If the bug cannot be reproduced in Step 3 after a thorough attempt, stop and report to the user with what you observed. Do not proceed to fixing.
- If the fix-validate loop reaches 5 attempts without success, stop and summarize: what you tried, what changed, and what still fails.
- Default to autonomous action. Escalate only when the correct path is genuinely ambiguous.
