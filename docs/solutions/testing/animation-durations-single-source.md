---
title: Animation durations live in JS so both zeroing paths can reach them
date: 2026-09-17
category: testing
module: animation_timing
problem_type: architecture_pattern
component: frontend
severity: medium
applies_when:
  - Adding an animation, transition, or timed delay to a component or recipe
  - Reading a duration in JS for CSSTransition, setTimeout, or a Motion tween
  - "Reaching for token('durations.x') outside an inline style prop"
  - A Puppeteer test is slow or intermittent around an animated element
  - Changing how animations are disabled under test
tags:
  - animations
  - durations
  - panda-css
  - e2e
  - csstransition
  - test-timing
---

# Animation durations live in JS so both zeroing paths can reach them

## Context

[`src/durations.config.ts`](../../../src/durations.config.ts) is a plain map of numbers, `as const`, default-exported. [`panda.config.ts`](../../../panda.config.ts) imports it and `durationsReducer` turns each entry into `{ value: { base: '<n>ms', _test: '0ms' } }`, registered under `semanticTokens.durations`. The dependency runs JS → Panda, and it runs that way because the other direction was built first and abandoned.

#2110 set out to disable every animation under Puppeteer so the `sleep` calls could come out of the e2e suite. The original design made the Panda config the source of truth and read the values back into JS through a parser — `toMilliseconds(token('durations.highlightPulseDuration'))` — and #2450 landed that parser. It came apart when `token()` on a *semantic* token turned out to return a variable reference rather than a value:

```ts
token('durations.layoutSlowShift') // 'var(--durations-layout-slow-shift)'
```

A `var()` reference is perfectly good in CSS and useless to a number-parser: `toMilliseconds` yields `NaN` on it. Only semantic tokens accept the `base`/`_test` split that zeroes the value under test, so dropping down to a plain token was not an option either. If Panda cannot be the source of truth, durations are defined in JS and imported into the Panda config. #2482 inverted it.

The escape hatch that looks like it removes the JS side entirely — a test-only `* { transition: none }` sheet — was raised in the same thread and rejected: `CSSTransition` swaps its class with an internal `setTimeout`, so the JS-side duration must actually be `0`. [`FadeTransition`](../../../src/components/FadeTransition.tsx) and [`SlideTransition`](../../../src/components/SlideTransition.tsx) pass `durations.get(...)` straight into `timeout`, and no CSS reaches that timer.

One signal, two delivery paths. `navigator.webdriver` reaches CSS through [`index.html`](../../../index.html), whose inline script sets `data-env` on the body before the app module loads, which is what Panda's `test: '[data-env=test] &'` condition keys on; and it reaches JS through [`durations.ts`](../../../src/util/durations.ts), whose `inTest` is read once at module init (guarded with `typeof navigator !== 'undefined'`, because `constants.ts` pulls the module into the Node-side e2e helpers) and applied by `durationOrZero`. The attribute is written once, before React loads — which is why restoring production timing means reloading the page rather than flipping a flag, the shape [testing.md → Sanctioned Backdoors](../../testing.md#sanctioned-backdoors) already constrains.

## Guidance

Declare the number in `durations.config.ts`. Read it by the idiom of the place you are in:

| Where | Idiom |
| --- | --- |
| A recipe or a `css()` object | Panda's token reference inside the string — `transition: 'all {durations.fast} ease-out'` ([`slideTransition.ts`](../../../src/recipes/slideTransition.ts), [`fadeTransition.ts`](../../../src/recipes/fadeTransition.ts), [`EmptyThoughtspace.tsx`](../../../src/components/EmptyThoughtspace.tsx)) — or the bare key where the property takes a token, `animationDuration: 'layoutSlowShift'` ([`fauxCaretTreeProvider.ts`](../../../src/recipes/fauxCaretTreeProvider.ts)). |
| An inline `style` prop | `token('durations.layoutSlowShift')`, which emits the `var()`. One live call site, in [`Thought`](../../../src/components/Thought.tsx). |
| JS | `durations.get('fast')`, or `durations.getAll()`. `setInTest` exists for the util's own tests and nothing else. |

`token()` is the minority form and the one that misleads: it belongs in a style string, and a reader who carries it into JS gets a `var()` reference back.

The import path is lint-enforced. `em/no-direct-durations-config-import` in [`packages/eslint-plugin-em`](../../../packages/eslint-plugin-em/index.js) runs at error level from [`eslint.config.js`](../../../eslint.config.js) and rejects any import of `durations.config` outside `src/util/durations.ts`, `__tests__` files and `panda.config.ts`. **The literal is not enforced by anything.** Nothing stops a component or a recipe from writing `400` or `'400ms'` inline, and that is precisely the form both zeroing paths cannot see.

The rule to apply is: any duration the e2e suite could end up waiting on goes in `durations.config.ts`. The codebase is not literal-free, and the two live exceptions are in [`dialogRecipe`](../../../src/recipes/dialogRecipe.ts) — `animationDuration: '1s, 1s'` on a pair of fades whose clock is `animationTimeline: 'scroll(self)'` rather than wall time, and `transition: 'opacity 0.3s ease'` on the scrollbar thumb. Neither is on a path a test waits for. Treat them as the exceptions they are, not as the pattern.

## Why This Matters

A literal duration typechecks, passes lint, renders correctly, and looks identical to the reviewed form in a screenshot. Its only effect is in CI: that element keeps production timing for the whole Puppeteer suite, and the cost surfaces somewhere else — a slower run, or an intermittent failure in a test that never mentions the animation. There is no error to read. It is the accidental form of what [testing.md → Sanctioned Backdoors](../../testing.md#sanctioned-backdoors) enumerates under timing and environment spoofing: production timing restored inside a test run, but unnamed, unreviewed, and permanent.

The suite is the reason the architecture exists at all. Removing the sleeps this unlocked cut a local e2e run from ~60s to ~38s (#2491), and #2515 closed #2110 out. Reintroducing timing one literal at a time gives that back quietly.

The shape most likely to be copied is the seconds-based one. Motion takes seconds — `framer-motion` in [`Tip`](../../../src/components/Tips/Tip.tsx) and [`useSwipeToClear`](../../../src/components/Tips/useSwipeToClear.ts), `motion/react` in [`CommandCenter`](../../../src/components/CommandCenter/CommandCenter.tsx) and [`GestureContentBlur`](../../../src/components/GestureMenu/GestureContentBlur.tsx) — so each reads `durations.get('x') / 1000`. [`Sidebar/constants.ts`](../../../src/components/Sidebar/constants.ts) exports `MEDIUM_DURATION` and `SLOW_DURATION` the same way, and its consumers spend them both as Motion `duration` and as `${MEDIUM_DURATION}s` inside inline CSS strings. A `0.4` written in place of that expression reads as the tidier line.

Nothing in [`code-standards`](../../../.github/instructions/code-standards.instructions.md) mentions durations, and [folder-structure.md](../../folder-structure.md) describes `durations.config.ts` as design-token configuration consumed by Panda CSS — which reads as exactly the inverted dependency the design was chosen to avoid. That line is a [`docs-sync`](../../../.github/skills/docs-sync/SKILL.md) fix, not a claim to correct here.

## When to Apply

- **Adding an animation**, add a named key to `durations.config.ts` with a comment saying what it animates, then read it by the idiom of the call site. Reusing `fast`/`medium`/`slow` is fine; the file is organised around them.
- **Reviewing a diff that touches `transition`, `animationDuration`, `timeout` or `setTimeout`**, run the scan. It currently returns exactly the two known exceptions, so a third hit is the review question:

  ```sh
  grep -rnE "(transition|animationDuration|transitionDuration)['\"]?:.*[0-9]+(\.[0-9]+)?m?s" src/recipes src/components | grep -v "durations\."
  ```

- **When a Puppeteer test is slower or flakier than its neighbours**, check whether the element it waits on animates on a literal before treating it as a synchronization problem. [testing.md → Never wait for wall-clock time](../../testing.md#3-never-wait-for-wall-clock-time-wait-for-the-response) is the rule the test is meant to follow; a literal is what makes following it impossible.
- **Before spoofing `navigator.webdriver` to get production timing back**, weigh how wide the spoof is. Eleven non-test modules under `src/` branch on it — durations, `debugLog`, `offlineStatusStore`, paste handling, Lottie autoplay, scrolling and more — so the flag restores far more than the animation the test is waiting on, and the CSS half does not move at all without a reload. Setting the specific state the test needs is the narrower act. See [testing.md → Preserve production behavior](../../testing.md#9-preserve-production-behavior).

## Examples

Both of these animate a panel over 400ms in the browser. The second one also animates it over 400ms in every Puppeteer run.

```ts
// Zeroed by the _test condition on the token.
transition: 'opacity {durations.medium} ease'

// Invisible to both zeroing paths. Lints clean.
transition: 'opacity 400ms ease'
```

Already tried in #2110 and #2482 — do not retry without new information:

- **Defining durations only in the Panda config and parsing them back in JS.** `token()` on a semantic token returns `var(--durations-…)`, and only semantic tokens carry the `_test` value. [`toMilliseconds`](../../../src/util/toMilliseconds.ts) is what remains of this: as of this writing it has no callers outside its own test, and `toMilliseconds(token('durations.medium'))` still typechecks and still returns `NaN`.
- **Disabling transitions test-side with a global CSS override.** `CSSTransition` schedules its class swap with `setTimeout`; a stylesheet cannot make that timer fire sooner.
- **Sleeping out the animation in the Puppeteer test.** The state #2110 replaced.

## Related

- #2110, #2343, #2450, #2482, #2491, #2515
- [Measuring a layout shift when test timing has collapsed the animation](measuring-layout-shift-with-animations-zeroed.md) — what zeroing does to a test that tries to sample an intermediate frame.
- [testing.md → Never wait for wall-clock time](../../testing.md#3-never-wait-for-wall-clock-time-wait-for-the-response), [Preserve production behavior](../../testing.md#9-preserve-production-behavior), [Sanctioned Backdoors](../../testing.md#sanctioned-backdoors)
- [`src/util/durations.ts`](../../../src/util/durations.ts) — the JS half, whole.
