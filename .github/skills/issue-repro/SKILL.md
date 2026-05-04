---
name: issue-repro
description: >-
  ALWAYS USE THIS SKILL when working on an issue that has "Steps to Reproduce".
allowed-tools:
  - bash
  - chrome-devtools
---

If you are working on a GitHub issue that includes "Steps to Reproduce", "Current Behavior", and "Expected Behavior" sections, you must follow this step-by-step guide to confirming the bug exists and validate your fix.

Follow these instructions **directly**, while observing the methodology described to you (regarding the usage of `ci-monitor`, `test-diagnosis` and `puppeteer` skills where appropriate). DO NOT deviate from this process, skip steps, or make assumptions about the cause of the error without first attempting to reproduce it as described.

By following the documented steps in the issue, you can reliably reproduce the problem and ensure your solution works as intended without guesswork or assumptions.

## Stages

1. **Parse** — extract Steps to Reproduce, Current Behavior, Expected Behavior from the issue.
2. **Emulate** — decide whether mobile emulation is required and apply it **before any navigation**.
3. **Start** — ensure the dev server is running.
4. **Reproduce** — drive the Chrome DevTools MCP through the steps; confirm the failure mode fires.
5. **Fix** — root-cause and fix the code.
6. **Validate** — re-run the steps; confirm the failure is gone and the expected behavior is observed.

**You MUST** be able to reproduce the issue directly – if you cannot, **DO NOT** assume the cause without first confirming with the user.
**DO NOT explore a fix** until you have successfully reproduced the issue. **This is your priority.** If you **CANNOT FULLY REPRODUCE** the steps, **FAIL AND ESCALATE TO THE USER.**
Similarly, a fix is **not complete** until both Step 4 and Step 5 pass.

---

## Step 1: Parse the Issue

Use the GitHub MCP `get_issue` tool to read the full issue body.  Extract these three sections — headings vary slightly across issues so match loosely:

| Section | Common headings |
|---|---|
| Steps to reproduce | "Steps to Reproduce", "Step to Reproduce", "How to reproduce" |
| Failure | "Current Behavior", "Current behavior", "Actual Behavior" |
| Goal | "Expected Behavior", "Expected behavior" |

If the issue body is ambiguous, read any attached comments before asking the
user for clarification. If a section is genuinely absent, stop and ask.

Sometimes, there may be multiple steps to reproduce within a single issue. If so, you must reproduce and fix each one separately, following the same process for each. Do not attempt to fix multiple reproduction paths at once.

---

## Step 2: Configure Device Emulation

Decide whether the issue requires mobile emulation **before doing anything else in the browser**. The Chrome DevTools MCP keeps a persistent Chrome instance, so emulation must be applied before the first navigation — otherwise the initial page load happens under the wrong profile and reproductions become unreliable.

### When to enable mobile emulation

Enable mobile emulation if **any** of the following are true about the issue:

- It is tagged `[Mobile]`, `[Android]`, or `[iOS]`, or its title/body explicitly mentions mobile, iPhone, Android, or "on my phone".
- The Steps to Reproduce reference touch interactions: **tap**, **swipe**, **long-press**, **pinch**, **drag with finger**, **two-finger**, or any gesture that does not exist on a mouse. Mouse-only language ("click", "hover", "right-click") does not count.
- The Current Behavior is described in terms of mobile-only UI (bottom sheet, mobile keyboard, on-screen keyboard, viewport zoom, virtual keyboard overlay, etc.).

If none of those signals are present, skip this step — the desktop default is correct.

### How to enable it

Call the Chrome DevTools MCP `emulate` tool with an iPhone-class profile, **before any `navigate` call**:

- `viewport`: `390x844x3,mobile,touch` — iPhone 14 dimensions (390×844 CSS px), DPR 3. The `mobile` flag triggers mobile media queries; the `touch` flag delivers touch events instead of mouse events so swipe/tap/long-press behave correctly.
- `userAgent`: a current iOS Safari UA, e.g. `Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1`.

If you have already navigated by mistake, re-apply emulation and re-navigate so the page loads cleanly under the mobile profile.

---

## Step 3: Start the App

Check whether the dev server is already running:

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

If the response is not `200`, start it:

```bash
yarn start
```

Poll until port 3000 responds before continuing. The server takes ~5–15 seconds to start.

---

## Step 4: Use Chrome DevTools MCP

Use the **Chrome DevTools MCP** (`chrome-devtools`) for all browser automation. Do **not** use the Playwright MCP — it is unstable and unreliable.

The Chrome DevTools MCP provides tools such as `navigate`, `screenshot`, `evaluate`, `click`, `type`, and `get_console_logs`. Use these throughout the reproduction and validation steps.

---

## Step 5: Reproduce the Failure

If Step 2 determined that mobile emulation is required, confirm `emulate` has already been applied before proceeding — the first navigation below must happen under the mobile profile, not after.

1. Open a fresh browser tab at `http://localhost:3000`.

2. **Clear app state** so you start from a clean slate. In the browser console run:
   ```js
   localStorage.clear(); location.reload();
   ```

3. Follow the **Steps to Reproduce** from the issue **exactly as written** —
   same order, same actions, no shortcuts. After each step, verify the UI
   reflects the expected intermediate state before continuing.

4. After the final step, check whether the **Current Behavior** described in the
   issue occurs. Observe UI state, console log messages, or any other indication as stated in the issue.

5. **Document what you observed** — quote the error message or describe the UI
   state. If the failure does not occur, **note this explicitly and do not proceed**
   **to fixing**. Instead, report to the user and ask for clarification (different
   browser, platform, version, or data state required?).

**YOU MUST ESCALATE NOW IF YOU CANNOT EXPLICITLY REPRODUCE**

### em App Interaction Reference

- You can use the keyboard and mouse tools in the Chrome DevTools MCP to interact with the app as needed.
- Read **em**'s UI code to understand how to trigger certain behaviors if the steps are not explicit.

---

## Step 6: Fix the Issue

1. Use the reproduction evidence (error message, stack trace, console output) to locate the root cause. Read the relevant source code. Do not guess the cause without evidence.
2. Implement a targeted fix. Prefer the smallest change that addresses the root cause without breaking related behavior.
3. Ensure related behavior is not broken by taking a moment to analyze any potential impact of your change on the surrounding code and features. Fix any issues you identify before proceeding to validation.
4. Restart or hot-reload the app. (`yarn start` hot-reloads on file change, so a page reload is usually sufficient. For build-level changes, re-run `yarn build`.)

---

## Step 7: Fix-Validate Loop (Mandatory)

After applying a fix, validate it immediately. If validation fails, fix and
validate again. Repeat until the issue is resolved or the attempt limit is reached.

**Maximum attempts: 5.** Track the attempt count. If the issue still reproduces
after 5 fix-and-validate cycles, stop and escalate to the user with a summary
of what you tried and what you observed each time.

### Validation criteria (both must pass)

**7a — Failure no longer triggers**

1. Open a fresh browser tab at `http://localhost:3000`.
2. Clear app state: `localStorage.clear(); location.reload();`
3. Follow the **Steps to Reproduce** exactly.
4. Confirm the **Current Behavior** (the bug) does **not** occur.

**7b — Expected behavior is observed**

1. In the same or a fresh tab, follow the steps again.
2. Confirm the **Expected Behavior** from the issue is observed exactly as described.

### Loop

```
attempt = 1
loop:
  fix the code (Step 6)
  run validation 7a and 7b
  if both pass → done, summarize what you changed
  if either fails → diagnose what still went wrong
  attempt += 1
  if attempt > 5 → escalate to user
```

Never claim success without completing both 7a and 7b. Never skip the loop.

---

## Escalation Rules

- If the bug cannot be reproduced in Step 5 after a thorough attempt, stop and report to the user with what you observed. Do not proceed to fixing.
- If the fix-validate loop reaches 5 attempts without success, stop and summarize: what you tried, what changed, and what still fails.
- Default to autonomous action. Escalate only when the correct path is genuinely ambiguous.
