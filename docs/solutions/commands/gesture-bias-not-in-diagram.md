---
title: The 25/65 gesture bias is deliberately absent from GestureDiagram
date: 2026-09-17
category: commands
module: gestures
problem_type: design_pattern
component: frontend
severity: medium
applies_when:
  - Noticing that the recogniser accepts a segment angle the diagram never draws
  - Editing the dx/dy deltas or the reversalRatio term in getGestureGeometry
  - Changing dirToRad's bias tables or the bias selection in MultiGesture
  - Adding a per-gesture exception because one diagram looks wrong
tags: [gestures, gesturediagram, recognizer, affordance, rejected-change]
---

# The 25/65 gesture bias is deliberately absent from GestureDiagram

## Context

The recogniser accepts a perpendicular swipe up to 65° off-axis. The diagram draws that same swipe as a right angle. The mismatch is a rejected change, not an outstanding bug: #3208 implemented both halves, and the diagram half was dropped in review before the issue closed.

The setup it needs, and no more. `dirToRad` in [`MultiGesture.tsx`](../../../src/components/MultiGesture.tsx) (:60-79) holds three tables of intercardinal boundaries; `gesture()` (:83-99) classifies a segment's `Math.atan2` angle against whichever table the caller names, producing one letter of the `l`/`r`/`u`/`d` string described in [Commands → Gesture activation](../../commands.md#gesture-activation). `NoBias` puts the boundaries on the true diagonals. `VerticalBias` moves them to ±5π/36 and ±31π/36 — 25° and 155° — widening the wedge that resolves to `u`/`d`; `HorizontalBias` moves them to ±13π/36 and ±23π/36 — 65° and 115° — widening the wedge that resolves to `l`/`r`. Each is selected for the axis perpendicular to the previous segment.

What the fractions buy is not written down beside them, and the `gesture()` docstring points at #1379 rather than at #1983, where they came from. They cure an oscillation: swipe right, then 45° down-left, and the sequence used to come out `→↓←↓←↓…` instead of `→↓`. Every segment was classified against an unbiased 45° diagonal, and a finger travelling near that line crosses it repeatedly, appending a direction each time. Moving the ambiguous boundary from 45-45 to 25-65 puts the diagonal far enough from the intended axis that a wobbling finger stays on one side of it.

## Guidance

**The diagram stays cardinal.** The component is [`GestureDiagram.tsx`](../../../src/components/GestureDiagram.tsx); the geometry model is [`getGestureGeometry.ts`](../../../src/components/GestureDiagram/getGestureGeometry.ts), whose `getDelta` emits a unit step along one axis only (:153-154):

```ts
dx: horizontal ? (1 - shorten) * (negative ? -1 : 1) : (reversal ? reversalRatio : 0) * (flipOffset ? -1 : 1),
dy: !horizontal ? (1 - shorten) * (!negative ? -1 : 1) : (reversal ? reversalRatio : 0) * (flipOffset ? -1 : 1),
```

The off-axis `(reversal ? reversalRatio : 0) * (flipOffset ? -1 : 1)` term is the only place a segment leaves its axis, which makes it the natural place for a future author to fold a skew back in.

**`reversalRatio` is not the skew.** It is the `reversalOffset` prop as a fraction of the gesture's size, and what it offsets is a vertex at a reversal so the return leg does not land on the outbound one — see the prop's docstring in [`GestureDiagram.tsx`](../../../src/components/GestureDiagram.tsx) (:83). Its presence does not mean the 20° perpendicular skew was reinstated.

## Why This Matters

#1983's closing comment is the decision of record: the skew is an ergonomic affordance, not part of the gesture's identity, and is best provided as a hidden affordance rather than shown — without clear cardinal directions, diagrams get much harder to conceptualize. A user must still be able to think "right, down, right" even when the down swipe is entered on a slant.

Both halves are stable and still diverge. `git log -S'VerticalBias'` returns a single commit — 2d0bdeb926, PR #3208, merged 2025-09-26 — so the recogniser side is unchanged since it landed. The diagram side was rewritten entirely in September 2026 (6f881172cb … a707b32a12) around a canonical geometry model, and came out of that rewrite still composing segments from cardinal unit steps. The divergence survived a full replacement of the renderer; it is not an oversight waiting to be tidied.

## When to Apply

- **Before "fixing" the mismatch.** Reopening it means reopening #1983's conclusion, not patching geometry. State that intent in the PR.
- **Before editing `getDelta`.** A new off-axis term has to be justified as a rendering device, not as agreement with `dirToRad`. [`__tests__/getGestureGeometry.ts`](../../../src/components/GestureDiagram/__tests__/getGestureGeometry.ts) pins exact segment coordinates as well as overall bounds, so a skew moves both — read the diff, do not re-bless it.
- **When one gesture's diagram looks wrong.** Per-gesture exceptions are the symptom that produced the revert, not the fix. See Examples.
- **When exercising the diagram in a browser test**, use the sanctioned static paint fixture rather than a fresh helper — the `renderGestureDiagram` row in [Testing → Sanctioned Backdoors](../../testing.md#sanctioned-backdoors).

## Examples

What accumulated against the skew over #1983's review — each a rendering that a general skew rule produced, not a description of how anything renders now:

| Gesture | What the skew did to it |
| --- | --- |
| `rdr` | Skewing every perpendicular segment lost 20° twice and drew a lightning bolt instead of a z, so only the middle `d` could take it — and a skewed segment descends less, so the diagonal had to be extended to keep the diagram from coming out shorter. |
| `rdl` | Looked wrong skewed at all; needed an exception. |
| `rdu` | The skew tipped the reversal so it doubled back up through the original `r`. |
| `rddl` | Excluded by name in #3208 as "a special shape that doesn't look right if it is skewed". |

The rule narrowed from "every perpendicular segment" to "a perpendicular swipe between two identical swipes, i.e. `xyx`", and was then dropped altogether. Four exceptions to one geometry rule is the shape of a change that is wrong rather than incomplete.

(Faking the angle with a fixed `dx` offset was rejected up front: gesture segments have a minimum length but no maximum, and a constant offset changes the rendered angle as the segment lengthens — preserving it is a sin relationship. Moot while nothing is skewed.)

## Related

- #1983, #3208
- [Commands → Gesture activation](../../commands.md#gesture-activation) — the gesture string, the gesture zone, `handleGestureSegment` and `handleGestureEnd`.
- [Glossary → gesture](../../glossary.md#g)
- [Testing → Sanctioned Backdoors](../../testing.md#sanctioned-backdoors) — the `renderGestureDiagram` static SVG paint fixture.
