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
**DO NOT explore a fix** until you have successfully reproduced the issue. **This is your priority.** If you **CANNOT FULLY REPRODUCE** the steps, **FAIL AND ESCALATE TO THE USER** — except for an ambiguous `[Mobile]` issue, where you first retry on `ios` before escalating (see Step 3).
Similarly, a fix is **not complete** until both Step 5a and Step 5b pass.

> **iOS is fully reproducible here — never opt out.** iOS issues run on **real iOS devices via BrowserStack App Automate**, driven by the `wdio` MCP through `browser-control` → `browser-control-ios`. You do **not** need a local Mac, a physical device, or a simulator. "This is iOS-specific / needs a physical device / I can't automate iOS" is **never** a valid reason to skip reproduction or to jump straight to a fix. If `target = ios`, hand off to `browser-control` and reproduce on the cloud device exactly as you would for web or android.

---

## Step 1: Parse the Issue

Use the GitHub MCP `get_issue` tool to read the full issue body. Extract these three sections — headings vary slightly across issues so match loosely:

| Section            | Common headings                                               |
| ------------------ | ------------------------------------------------------------- |
| Steps to reproduce | "Steps to Reproduce", "Step to Reproduce", "How to reproduce" |
| Failure            | "Current Behavior", "Current behavior", "Actual Behavior"     |
| Goal               | "Expected Behavior", "Expected behavior"                      |

If the issue body is ambiguous, read any attached comments before asking the
user for clarification. If a section is genuinely absent, stop and ask.

Sometimes, there may be multiple steps to reproduce within a single issue. If so, you must reproduce and fix each one separately, following the same process for each. Do not attempt to fix multiple reproduction paths at once.

### Determine the target platform

Pick exactly one of `web`, `android`, or `ios` — `browser-control` is going to need it in Step 2. Use issue tags first, fall back to keyword scan, default to `web`.

**Tags (primary):**

| Tag                     | Target    |
| ----------------------- | --------- |
| `[iOS]`, `[Safari]`     | `ios`     |
| `[Android]`, `[Mobile]` | `android` |
| no platform tag         | `web`     |

`[Mobile]` without `[iOS]` is treated as **`android`** — the cheaper environment (mobile Chrome via the puppeteer suite; no iOS device to spin up) that reproduces almost all mobile-only behavior. For these **ambiguous-mobile** cases (the `[Mobile]` tag, or the generic mobile language below), `android` is a **default with an iOS fallback**, not a commitment: if you cannot reproduce on mobile Chrome, the bug is most likely iOS-specific, so retry on `ios` before escalating (see Step 3). Explicit `[Android]` (or "Chrome on mobile") stays `android` with **no** fallback; explicit `[iOS]`/`[Safari]` goes straight to `ios`.

**Body keywords (fallback):**

If no tag is present, scan the title and body. If any of the iOS-specific terms below appear (and no Android-specific terms), pick `ios`:

- iOS-specific: "iPhone", "iPad", "iOS", "Safari", "WebKit", "Mobile Safari".
- Android-specific: "Android", "Chrome on mobile".
- Generic mobile (no platform commitment): "tap", "swipe", "long-press", "pinch", "on my phone", "bottom sheet", "on-screen keyboard", "virtual keyboard". These imply `android` unless paired with an iOS-specific term above.

If desktop-only language is used ("click", "hover", "right-click", no mobile hints), pick `web`.

If you cannot determine the target after this — for example, an issue mentioning both iOS and Android — stop and ask the user which platform to reproduce on. Do not guess: an iOS-only bug will not reproduce under Android emulation and vice-versa.

State the chosen target out loud before continuing — and for an ambiguous-mobile default, note the iOS fallback, e.g. `issue-repro: target = android (issue tagged [Mobile], body mentions "swipe"); iOS fallback if mobile-Chrome repro fails.`

---

## Step 2: Set Up the Browser

Hand the target platform you picked in Step 1 to the **`browser-control`** skill. It will:

1. Attach the correct MCP — `chrome-devtools` for `web`/`android`, `wdio` for `ios` — and apply mobile emulation if needed, **before any navigation**.
2. Navigate to the dev server.

Do not pick the MCP, apply emulation, or start a dev server yourself — `browser-control` owns all of that. Wait for it to confirm the environment is up before continuing.

---

## Step 3: Reproduce the Failure

The browser environment is now ready (Step 2) with a fresh browser profile and an empty `localStorage` — no app-state cleanup is needed before the first reproduction. Use the MCP that `browser-control` selected — `chrome-devtools` for web/android targets, `wdio` for iOS.

1. Follow the **Steps to Reproduce** from the issue **exactly as written** —
   same order, same actions, no shortcuts. After each step, verify the UI
   reflects the expected intermediate state before continuing.

2. After the final step, check whether the **Current Behavior** described in the
   issue occurs. Observe UI state, console log messages, or any other indication as stated in the issue.

3. **Document what you observed** — quote the error message or describe the UI
   state. If the failure does not occur, **note this explicitly and do not proceed**
   **to fixing**.

   **Ambiguous-mobile → iOS fallback.** If the target was an ambiguous-mobile default
   (`android` chosen from `[Mobile]` or generic mobile language — *not* explicit `[Android]`)
   and the issue did **not** reproduce on mobile Chrome, re-run Step 2 with `target = ios`
   and attempt the reproduction on the real iOS device **before escalating** — a mobile bug
   that won't repro in Chrome is most likely iOS-specific. Only if it **also** fails on iOS
   do you escalate.

   Otherwise — explicit `web`/`android`/`ios` (or iOS already retried and failed) — report to
   the user and ask for clarification (different browser, platform, version, or data state
   required?).

**YOU MUST ESCALATE IF YOU CANNOT EXPLICITLY REPRODUCE** — but for an ambiguous `[Mobile]` issue, run the iOS fallback above first.

### em App Interaction Reference

Split every interaction into **observing** vs **actuating** — the kind decides the tool (full detail in `browser-control`'s **Driving em interactions**).

- **Observing is exploratory** — reading state to figure out what's happening (evaluate scripts, inspect the DOM, screenshots, console, network). Use the full MCP/tool surface freely; nothing is off-limits.
- **Actuating em goes through the canonical e2e helpers when one exists** — anything that *drives* em's behaviour: tapping **any** em control (a thought, a button, a toolbar icon, a menu item), typing into a thought, gestures, selection. Drive them via the executor bridge. Two reasons: they encapsulate dispatch that's easy to get wrong by hand, and a repro built from helper calls transfers near-free into the automated test.
- **The trap:** em controls use `fastClick` (touch events under mobile emulation), so a **raw mouse click silently no-ops** on a touch-emulated page — no error, you just misread it as "the button doesn't work." The **`click` helper** taps right per platform (`page.tap` mobile / `page.click` desktop). A tap is **not** "mechanical" just because it's a tap — if it's em's own UI, use the helper. Check the catalog before assuming otherwise.
- **If no helper covers an actuation, drive it with the MCP/tooling and keep going** — no stopping, no escalation; just don't hand-reimplement an existing helper. (Note the gap as a candidate helper.) (Both iOS and web/android run helpers through the bridge — see the platform `browser-control-*` sub-skill.)
- To find helpers, list `src/e2e/<platform>/helpers/` and read the relevant helper's source for its signature before composing — that directory is the catalog.
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
2. Clear app state from the previous attempt: `localStorage.clear(); location.reload();`. After the reload, wait for the page to re-mount (poll for `#skip-tutorial` or `[aria-label="empty-thoughtspace"]`) before continuing — the React bundle re-runs from scratch.
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
- Lacking a local device or simulator is **not** an escalation reason for iOS — iOS reproduces on BrowserStack real devices via `browser-control`. Only escalate an iOS issue after a genuine reproduction attempt through `browser-control-ios` has actually failed.
- If the fix-validate loop reaches 5 attempts without success, stop and summarize: what you tried, what changed, and what still fails.
- Default to autonomous action. Escalate only when the correct path is genuinely ambiguous.
