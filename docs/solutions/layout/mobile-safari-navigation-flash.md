---
title: The Mobile Safari navigation flash is a browser limit, not a timing bug
date: 2026-09-17
category: layout
module: layout_rendering
problem_type: ui_bug
component: frontend
symptoms:
  - The whole screen flashes for a frame while navigating from one thought to another
  - Most visible when the home children fade out
  - Mobile Safari only, in the browser and in the installed PWA
  - Not reproducible on desktop even with isTouch forced to true
  - Not reproducible under automation, where every animation duration is zeroed
root_cause: platform_limitation
resolution_type: documentation_update
severity: medium
tags:
  - ios-safari
  - autocrop
  - animation
  - compositing
  - known-limit
  - navigation
---

# The Mobile Safari navigation flash is a browser limit, not a timing bug

## Problem

#1778 is closed NOT_PLANNED and labelled `dependency-bug`. A new report of the whole-screen flash during navigation on Mobile Safari is that issue again: the investigation ran from January to April 2024, exhausted the re-timing approaches, and concluded that Safari cannot scroll, reposition and animate without a flash. The only levers that ever removed it were removing an animation or removing the imperative scroll — not moving either one earlier or later. Nothing has been retested against a later iOS since.

Four things change on the frame the cursor moves. Two are transitions the compositor is interpolating; the other two are single steps that land whole.

| Participant | Where | Animated |
| --- | --- | --- |
| The viewport | `useAutocrop`'s `window.scrollTo({ top: scrollY - spaceAboveDelta })` in [`LayoutTree`](../../../src/components/LayoutTree.tsx) | no |
| Outer container, `transform: translateY(${autocrop}px)` | [`LayoutTree`](../../../src/components/LayoutTree.tsx), inline style | no |
| Inner container, `transform: translateX(${1.5 - indent}em` | [`LayoutTree`](../../../src/components/LayoutTree.tsx), under `transition: transform {durations.layoutSlowShift} ease-out` | 750 ms ([`durations.config.ts`](../../../src/durations.config.ts)) |
| Per-thought opacity, written as `ref.current.style.opacity = opacity` | [`Subthought`](../../../src/components/Subthought.tsx), in an effect with **no dependency array**, under `opacity {durations.layoutSlowShift} ease-out` when `autofocusChanged` | 750 ms, or 150 ms `ease-in` when it has not |

The scroll and the `translateY` are a matched pair — see [`useAutocrop` (vertical autocrop)](../../layout-rendering.md#useautocrop-vertical-autocrop) for why they cancel, and [Render tree](../../layout-rendering.md#render-tree) for which container carries which transform. What matters here is only that the scroll is unanimated, fires from a `useEffect` keyed on `spaceAboveExtended` rather than on scroll (the `// do not trigger effect on scrollY change` eslint-disable on the dep array is what makes that true), and therefore always lands whole, interrupting whichever of the two transitions is mid-flight. It is not a rogue scroll: [Scrolling the cursor into view](../../layout-rendering.md#scrolling-the-cursor-into-view) explicitly sanctions the autocrop compensation's bypass of [`scrollTo`](../../../src/device/scrollTo.ts), because it holds the viewport still while content shifts underneath and has no pending cursor scroll to supersede. The bypass is correct and is still the thing the flash falls out of.

Why the home children in particular is an open question. The issue asks it — "Why would the behavior be different in the home context?" — and never answers it.

## Symptoms

Mobile Safari only — browser and installed PWA alike — and not reproducible on desktop with `isTouch` forced to `true`, which rules out the touch-specific branches and leaves the engine.

Two diagnostics from the thread are expensive to re-derive and settle what the flash is made of:

- Pinning `Subthought`'s opacity permanently to `1` removes the flash. Pinning it to `0.99` does **not**. A thought that is merely not opaque is enough, animating or not, so the lever is the compositing layer opacity forces rather than the value — and, on this evidence, not the transition on its own either.
- The flash survives deferral. A fix that only pushes an animation past one scroll passes a single unhurried navigation and fails as soon as a second navigation starts before the first 750 ms transition has finished.

## What Didn't Work

Four documented dead ends, in the order they were tried.

**`setTimeout(0)` around the opacity write.** Fixes exactly one unhurried navigation from one thought to another, with plenty of time for the animation to finish. It reproduces immediately for subthoughts, and for any second navigation that starts before the first animation ends. It works at all only because it delays the animation until after the scroll has occurred — which is the whole shape of the problem, not a fix for it.

**Moving the scroll or the effect.** `useLayoutEffect`, scrolling from the render function, and hoisting the effect up to `Content` or `AppComponent` are all no-ops, marked `∅` in the issue's elimination list alongside `scrollCursorIntoView` and "no additional actions". Nothing about *when in the commit* the scroll is issued changes the outcome.

**Pausing the in-progress opacity transition.** The closest attempt: snapshot `getComputedStyle(ref.current).opacity`, treat any value that is not `0`, `0.5` or `1` as mid-animation, write that value back with `transition: 'none'`, and restore both after ~50 ms — 16 ms was measured and found not to be enough. This does fix the opacity half, but only while `LayoutTree`'s `translateX` is commented out, and it introduces glitchiness when creating new thoughts.

**The same pause applied to `translateX`.** Ineffective for a perceptual reason rather than a technical one: a fluctuation in the rate of a horizontal translation is plainly visible, where the identical fluctuation in an opacity ramp is not. Pausing and resuming the translate is fine before a single level of navigation and flickers as soon as several levels are navigated within the animation's duration. There is no way to hold the transition consistent and also avoid the scroll flash.

## Solution

None shipped. Treat a new report as a duplicate of #1778 and close it the same way.

If the flash must go, the two levers are:

- Remove one of the two animations. What is actually demonstrated is narrower than it sounds: opacity pinned to `1` — no dim, no fade — removes the flash, and disabling `LayoutTree`'s `translateX` is what made the opacity pause work. Dropping the opacity *transition* while dimmed thoughts still render at `0.5` was never tried, and the `0.99` result argues against it.
- Remove the imperative scroll, which means giving up vertical autocrop.

Both are product decisions about how navigation feels, not bug fixes.

## Why This Works

Nothing works, and knowing why saves the next attempt. The scroll is a single unanimated step that the compositor must apply whole. Each 750 ms transition is a layer the compositor is interpolating. Re-timing only changes which frame the collision lands on, and there is always another navigation to collide on. That is why every `∅` in the elimination list is a scheduling change and every partial success is a change to what is being animated.

Two nearby things are not the lever they look like:

- **Layer promotion.** [`Subthought`](../../../src/components/Subthought.tsx) already carries `willChange: 'opacity'`, and the comment beside it describes `will-change: transform` and a Safari subpixel jerk at the end of the horizontal shift — a different fix than the property it sits on, so do not read it as evidence about this flash. The other `willChange: 'opacity'` hints — in [`GestureMenu`](../../../src/components/GestureMenu/GestureMenu.tsx), and gated on `isAndroid` under [`Sidebar/`](../../../src/components/Sidebar/SidebarGlow.tsx) — address a Chromium WebView flicker where a fading subtree's compositor layer is dropped a frame early (see [When a blur, a blend, or a z-index silently does nothing](../styling/compositing-traps-blur-blend-stacking.md)). Here the layer is not missing; it is the problem.
- **The issue's own permalink.** #1778 links `VirtualThought.tsx#L346`, and its diff patches that file. The opacity effect and its transition moved to [`Subthought.tsx`](../../../src/components/Subthought.tsx) in 687fac2a1f, essentially unchanged, so a reader following the permalink lands in the wrong file and finds nothing.

## Prevention

- **Do not write a regression test for this.** Every duration token resolves to `0ms` under `navigator.webdriver` ([Animation durations live in JS](../testing/animation-durations-single-source.md)), so neither 750 ms transition exists in an automated run, and [`Subthought`](../../../src/components/Subthought.tsx) skips the fade-in outright there (`thought.value === '' || navigator.webdriver || isSplitThought ? opacity : '0'`). The collision has no animation to collide with, and a headless run will pass no matter what the engine does. Confirm by hand on a real Mobile Safari device, on the browser and on the installed PWA, or not at all.
- **Classify a candidate fix before building it.** If it changes *when* something runs — a timer, `useLayoutEffect`, a different component, a `requestAnimationFrame` — it is in the `∅` column already. If it changes *what is animated* or removes the scroll, it is new.
- **Test a candidate with two navigations, the second starting before the first finishes.** One navigation is not a reproduction; `durations.layoutSlowShift` is 750 ms, so the window is wide.
- **Do not reach for `will-change` here.** The rule from the sidebar and gesture-menu work applies: a `will-change` is warranted only when a named engine has demonstrably dropped or withheld a layer, with the engine and the frame written in the comment beside it. That is not this failure.

## Related

- #1778 — the report, the elimination list, and the attempted patches. Closed NOT_PLANNED, `dependency-bug`.
- #1751 — the original vertical autocrop work the counter-scroll comes from.
- [`useAutocrop` (vertical autocrop)](../../layout-rendering.md#useautocrop-vertical-autocrop) and [Indent (horizontal autocrop)](../../layout-rendering.md#indent-horizontal-autocrop) — the mechanism behind two of the four participants.
- [Render tree](../../layout-rendering.md#render-tree) — which container carries `translateY` and which carries `translateX`.
- [Scrolling the cursor into view](../../layout-rendering.md#scrolling-the-cursor-into-view) — why the autocrop scroll correctly bypasses `scrollTo`.
- [Glossary → autofocus](../../glossary.md#a) — why home children fade at all.
- [When a blur, a blend, or a z-index silently does nothing](../styling/compositing-traps-blur-blend-stacking.md) — the Android WebView compositing flicker this is not.
