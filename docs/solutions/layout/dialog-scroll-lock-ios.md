---
title: Dialog scroll lock belongs in CSS, not an un-counted global
date: 2026-09-17
category: layout
module: dialog
problem_type: ui_bug
component: frontend
symptoms:
  - Document body scrolls behind an open dialog on iOS
  - Dragging in the right-edge scroll zone pans the page underneath the dialog
  - A scroll begun inside the dialog's content pane continues in the viewport
  - Scroll lock holds with one surface open and releases when a second one closes
root_cause: global_flag_no_refcount
resolution_type: code_fix
severity: medium
tags:
  - ios-safari
  - dialog
  - scroll-lock
  - overscroll-behavior
  - touch-action
  - pwa
---

# Dialog scroll lock belongs in CSS, not an un-counted global

## Problem

`src/device/allowScroll.ts` was one boolean written to one global place:

```ts
/** Enables or disables scrolling based on the parameter. */
function allowScroll(allow: boolean) {
  if (allow) enableScroll()
  else disableScroll()
}
```

`disableScroll` set `document.body.style.overflow = 'hidden'`; `enableScroll` set it back to `''`. #3165 reported what that bought: scroll the thoughtspace, open the Gesture Cheatsheet, drag in the [scroll zone](../../commands.md#gesture-activation) along the right edge, and the document body scrolls behind the dialog. Two things are wrong with the shape, and the report collected both.

**Nothing counted how many surfaces held the lock**, so the last one to close spoke for all of them. Two command surfaces can be open at once — a command carrying `allowExecuteFromModal` runs while a modal is showing and can open a second one on top of it, see [commands.md → Gating and defaults](../../commands.md#gating-and-defaults) — and both called `allowScroll`. Ethan found the sequence without needing a PWA, in the component names of the day (`CommandPalette` is [`DesktopCommandUniverse.tsx`](../../../src/components/DesktopCommandUniverse.tsx) today, `GestureCheatsheet` is [`MobileCommandUniverse.tsx`](../../../src/components/dialog/MobileCommandUniverse.tsx), both renamed in 817b169b62):

> 1. let the command palette open, calling `allowScroll(false)` and disabling scroll
> 2. open the gesture cheatsheet, calling `allowScroll(false)` again
> 3. command palette unmounts, calling `allowScroll(true)` and re-enabling scrolling

**And one body-level declaration cannot say "this pane scrolls, the document does not"**, which is the entire requirement for a dialog holding a long scrollable list. Raine, on the report: "it has the added challenge of needing to allow scroll only on the dialog box." iOS Safari compounds it by carrying a scroll onward once it has begun — Ethan's reading, after the touch-action attempt still leaked: "it starts scrolling in the content pane and then decides to continue that scroll in the viewport (body) without respecting the `touchmove` event handler that tries to stop it."

## Symptoms

The body scrolls behind the open dialog while the dialog itself still looks and behaves like a modal. Reproducible in Mobile Safari and in an installed PWA, but confirm in the PWA — Single Tab mode changes Mobile Safari's scrolling enough that the two do not always agree. Raine's recipe for pointing a home-screen PWA at a dev server, from #3165 and recorded nowhere in the tree:

```sh
yarn build
yarn servebuild
# open http://<your-lan-ip>:3000/ in Mobile Safari, Add to Home Screen
# kill servebuild
yarn start
```

The installed PWA loads whatever is served at that address and port, so swapping the production build for `yarn start` afterwards leaves the home-screen app running the dev server.

## What Didn't Work

**#3167 — `touchAction: 'none'` on the overlay alone.** Tested on iOS Safari, iOS PWA and Android Chrome, approved, and it let `allowScroll` be dropped from both surfaces. Still leaked: drag from the Navigation header toward the right edge, or begin the touch inside the content pane and drift out onto the overlay. [`Dialog.tsx`](../../../src/components/dialog/Dialog.tsx)'s `touchmove` handler cannot catch the drift, because it tests `e.target`, which stays at the element the touch started on — still true of that handler today.

**`allowTouchToScroll` in place of `allowScroll`.** Filed as #3166, closed `NOT_PLANNED`. It appeared to work, but it swaps one shared global for another — "Both helpers are still prone to conflicts" — and `preventDefault` on `touchmove` at the body is the same all-or-nothing the dialog needed to escape.

**Native `<dialog>`.** Tried on the theory that iOS Safari's built-in modal behaviour would line up with what the app wanted: "I don't think `<dialog>` made too much of a difference."

**#3171 — hide overflow and fake the offset.** `overflow: hidden` on both `body` and `html` convinces iOS Safari there is nothing to scroll, at the cost of the scroll position, which the PR mimicked with a negative margin on the content. Closed once `overscroll-behavior: contain` turned out to do the job "without resorting to faking the scroll position".

## Solution

Containment is CSS on two slots of [`dialogRecipe.ts`](../../../src/recipes/dialogRecipe.ts), plus one JS listener that is not part of it:

| Where | Declaration | Job |
| --- | --- | --- |
| `overlay` slot | `touchAction: 'none'` | A drag that begins on the backdrop never becomes a document pan. |
| `content` slot | `overscrollBehavior: 'contain'` | The scrollable pane keeps the scroll chain to itself when it hits either end. |
| [`Dialog.tsx`](../../../src/components/dialog/Dialog.tsx) | a `touchmove` listener on the overlay that `preventDefault`s any move whose `e.target` is outside the sheet | Not containment. It disables iOS Safari's swipe-to-go-back, arrived with the cheatsheet in 93617b7e0a, and #3197 kept it deliberately for that. |

Neither declaration carries a comment of its own, though the scrollbar and mask blocks on either side of `overscrollBehavior` each carry several lines of rationale. Anchor on the slot names rather than on a line: the recipe was `src/recipes/dialog.ts` when #3197 landed, and has been restyled three times since into its present 17 slots (#4183, #4357, #4385).

#3197 deleted `allowScroll.ts` and it has never returned. It also merged with a known open failure: with the dialog open, rotating to landscape makes the page scrollable again, and rotating back scrolls the thoughtspace to the top — the second one is #3197's alone, and #3171 did not have it. Both were reproduced on the branch and explicitly deferred: "I'm comfortable dealing with the rotation bug in a separate issue. I don't think it needs to be a blocker." A reader meeting the orientation behaviour today is meeting that, not a regression.

## Why This Works

A declaration on the overlay and a declaration on the scroll pane are per-element state owned by the element that needs them, so a second dialog mounting or unmounting cannot reach them, and the pane can stay scrollable while the document does not. `document.body.style.overflow` is a single slot every caller shares, which is why counting is the only thing that would have made it correct, and why nobody added the counting. The two properties are load-bearing as a pair — [`touch-action`](https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action) stops a pan that starts outside the pane, [`overscroll-behavior`](https://developer.mozilla.org/en-US/docs/Web/CSS/overscroll-behavior) stops a scroll that starts inside it from chaining out — and #3167 is the evidence that removing either reopens one half of the report.

[`allowTouchToScroll`](../../../src/device/allowTouchToScroll.ts) survives, and is the drag path rather than a modal scroll lock: [`useLongPress`](../../../src/hooks/useLongPress.ts) calls it on long-press start so iOS Safari cannot begin a scroll before the drag does (#3141), and `endDrag` restores it — see [drag-and-drop.md](../../drag-and-drop.md#usedraghold-and-uselongpress). The comment that said which helper was which lived atop `allowTouchToScroll.ts` and was deleted by 0deaa8781a along with `allowScroll` itself, so the distinction is no longer recoverable from the tree:

```ts
/** … This is different from allowScroll, which set overflow: hidden on the body in order to prevent
 * scrolling in a fixed environment such as a modal. …
 */
```

Its signature carries a live trap of its own: `allowTouchToScroll(disable: boolean)` calls `enableScroll()` when passed `true`. The parameter name contradicts the branch, and every call site reads against the name — `allowTouchToScroll(false)` is the one that disables scrolling. `allowScroll(allow: boolean)` had the opposite polarity, which is part of why swapping one for the other looked cheap.

## Prevention

- **`grep -rn 'useLockBodyScroll' src` must return exactly one call site.** [`useLockBodyScroll.ts`](../../../src/hooks/useLockBodyScroll.ts) is `allowScroll` again — a boolean, `document.body.style.overflow = 'hidden'`, restored in effect cleanup, no reference counting. Its one consumer is [`Sidebar.tsx`](../../../src/components/Sidebar/Sidebar.tsx) (`useLockBodyScroll(showSidebar)`), and that is the only reason it is safe. Add a second concurrent consumer and the first to unmount clears `overflow` while the second is still locked: #3165 verbatim. If a second surface needs it, reference-count the hook or give that surface the CSS pair instead.
- **A new dialog inherits containment only by being built on [`dialog/Dialog`](../../../src/components/dialog/Dialog.tsx).** `MobileCommandUniverse` is its only consumer today. The twelve modals under `src/components/modals/` go through `ModalComponent` and do not touch `dialogRecipe` at all — a new one gets nothing and needs its own containment.
- **Verify on a home-screen PWA with the recipe above.** The iOS suite drives iOS Safari over WebDriver (`browserName: 'Safari'` in [`wdio.base.conf.ts`](../../../src/e2e/iOS/config/wdio.base.conf.ts)), never an installed PWA, and the Puppeteer suite is a desktop browser; neither can see this.
- **Before deleting an uncommented declaration in `dialogRecipe.ts`, check whether it is one of these two.** The rest of the file annotates its non-obvious values; `touchAction` on `overlay` and `overscrollBehavior` on `content` do not announce that a bug report is attached to them.

## Related

- #3165 — the report, the stacking sequence, and the PWA recipe.
- #3197 — the CSS pair, the deletion of `allowScroll.ts`, and the deferred orientation bug.
- #3167 — `touch-action` without `overscroll-behavior`, and why the `e.target` check cannot cover the gap.
- #3171 — the hide-overflow-and-offset approach that was superseded.
- #3166 — why the two helpers were never merged.
- #3141 — what `allowTouchToScroll` is actually for.
- [drag-and-drop.md → `useDragHold` and `useLongPress`](../../drag-and-drop.md#usedraghold-and-uselongpress) — `allowTouchToScroll` on the long-press path, and the `endDrag` restore.
- [commands.md → Toolbar and Command Universe](../../commands.md#toolbar-and-command-universe) and [Gating and defaults](../../commands.md#gating-and-defaults) — the two surfaces, and how one opens while the other is showing.
- [layout-rendering.md → Scrolling the cursor into view](../../layout-rendering.md#scrolling-the-cursor-into-view) — em's own deliberate viewport moves, which are not overlay containment.
- [folder-structure.md](../../folder-structure.md) — why these helpers live in `/src/device`.
