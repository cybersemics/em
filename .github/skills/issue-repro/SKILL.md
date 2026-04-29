---
name: issue-repro
description: >-
  Use this skill when asked to reproduce, investigate, or fix a GitHub issue.
  Reads the issue's Steps to Reproduce, Current Behavior, and Expected Behavior
  sections, then drives a browser to confirm the bug exists, and after a fix is
  applied, re-runs the same steps to validate the expected behavior is observed.
allowed-tools:
  - bash
---

# Issue Reproduction & Fix Validation

This skill turns a GitHub issue into a live, browser-driven test harness. It
uses the issue's own documented steps as the ground truth for both confirming a
bug and validating a fix — no speculation, no guessing.

## Overview

1. **Parse** — extract Steps to Reproduce, Current Behavior, Expected Behavior from the issue.
2. **Start** — ensure the dev server is running.
3. **Reproduce** — drive a browser through the steps; confirm the failure mode fires.
4. **Fix** — root-cause and fix the code.
5. **Validate** — re-run the steps; confirm the failure is gone and the expected behavior is observed.

A fix is **not complete** until both Step 4 and Step 5 pass.

---

## Step 1: Parse the Issue

Use the GitHub MCP `get_issue` tool (or fetch the issue URL) to read the full
issue body. Extract these three sections — headings vary slightly across issues,
so match loosely:

| Section | Common headings |
|---|---|
| Steps to reproduce | "Steps to Reproduce", "Step to Reproduce", "How to reproduce" |
| Failure | "Current Behavior", "Current behavior", "Actual Behavior" |
| Goal | "Expected Behavior", "Expected behavior" |

If the issue body is ambiguous, read any attached comments before asking the
user for clarification. If a section is genuinely absent, stop and ask.

---

## Step 2: Start the App

Check whether the dev server is already running:

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

If the response is not `200`, start it:

```bash
yarn start
```

Poll until port 3000 responds before continuing. The server takes ~5–15 seconds.

---

## Step 3: Use Chrome DevTools MCP

Use the **Chrome DevTools MCP** (`chrome-devtools`) for all browser automation. Do **not** use the Playwright MCP — it is currently unstable and unreliable.

The Chrome DevTools MCP provides tools such as `navigate`, `screenshot`, `evaluate`, `click`, `type`, and `get_console_logs`. Use these throughout the reproduction and validation steps.

---

## Step 4: Reproduce the Failure

1. Open a fresh browser tab at `http://localhost:3000`.

2. **Clear app state** so you start from a clean slate. In the browser console run:
   ```js
   localStorage.clear(); location.reload();
   ```

3. Follow the **Steps to Reproduce** from the issue **exactly as written** —
   same order, same actions, no shortcuts. After each step, verify the UI
   reflects the expected intermediate state before continuing.

4. After the final step, check whether the **Current Behavior** described in the
   issue occurs. Look for:
   - Red error banners in the UI (these are uncaught errors surfaced by the app)
   - Unexpected UI states or missing elements
   - JavaScript console errors

5. **Document what you observed** — quote the error message or describe the UI
   state. If the failure does not occur, note this explicitly and do not proceed
   to fixing. Instead, report to the user and ask for clarification (different
   browser, platform, version, or data state required?).

### em App Interaction Reference

| Action | How to perform |
|---|---|
| Create a new thought | Press `Enter` |
| Create a subthought (indent) | Press `Tab` on a new thought, or `Enter` on an indented thought |
| Unindent thought | Press `Shift+Tab` |
| Edit a thought | Click or tap it to place cursor |
| Access a command (e.g. Swap Parent) | Long-press or right-click a thought → Command menu; or open Command Universe |
| Dismiss / cancel | Press `Escape` |
| Open Command Universe (desktop) | `Ctrl+Shift+P` / `Cmd+Shift+P`, or the ⚡ toolbar button |

For issues tagged `[Android]` or `[Mobile]`, enable mobile device emulation
in the browser's devtools (e.g. iPhone 14 or Pixel 7) before following the
steps.

---

## Step 5: Fix the Issue

1. Use the reproduction evidence (error message, stack trace, console output) to
   locate the root cause. Read the relevant source code. Do not guess.
2. Implement a targeted fix. Prefer the smallest change that addresses the root
   cause without breaking related behavior.
3. Restart or hot-reload the app. (`yarn start` hot-reloads on file change, so
   a page reload is usually sufficient. For build-level changes, re-run `yarn build`.)

---

## Step 6: Fix-Validate Loop (Mandatory)

After applying a fix, validate it immediately. If validation fails, fix and
validate again. Repeat until the issue is resolved or the attempt limit is reached.

**Maximum attempts: 5.** Track the attempt count. If the issue still reproduces
after 5 fix-and-validate cycles, stop and escalate to the user with a summary
of what you tried and what you observed each time.

### Validation criteria (both must pass)

**6a — Failure no longer triggers**

1. Open a fresh browser tab at `http://localhost:3000`.
2. Clear app state: `localStorage.clear(); location.reload();`
3. Follow the **Steps to Reproduce** exactly.
4. Confirm the **Current Behavior** (the bug) does **not** occur.

**6b — Expected behavior is observed**

1. In the same or a fresh tab, follow the steps again.
2. Confirm the **Expected Behavior** from the issue is observed exactly as described.

### Loop

```
attempt = 1
loop:
  fix the code (Step 5)
  run validation 6a and 6b
  if both pass → done, summarize what you changed
  if either fails → diagnose what still went wrong
  attempt += 1
  if attempt > 5 → escalate to user
```

Never claim success without completing both 6a and 6b. Never skip the loop.

---

## Escalation Rules

- If the bug cannot be reproduced in Step 4 after a thorough attempt, stop and
  report to the user with what you observed. Do not proceed to fixing.
- If the fix-validate loop reaches 5 attempts without success, stop and
  summarize: what you tried, what changed, and what still fails.
- If the steps reference a mobile-only gesture that cannot be simulated in a
  desktop browser, note the limitation and ask the user if device testing is
  available.
- Default to autonomous action. Escalate only when the correct path is
  genuinely ambiguous.
