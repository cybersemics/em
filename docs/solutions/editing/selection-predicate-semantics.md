---
title: isActive, isThought, and isNote answer different questions
date: 2026-09-17
category: editing
module: selection
problem_type: best_practice
component: frontend
severity: medium
applies_when:
  - Adding a guard that asks whether the browser selection is on a thought
  - Writing or changing an onBlur handler that has to know where focus went
  - Reviewing a refactor that collapses two selection predicates into one
  - Auditing a command's canExecute that reads the browser selection
tags:
  - selection
  - caret
  - predicates
  - desktop
  - blur
  - commands
---

# isActive, isThought, and isNote answer different questions

## Context

Do not replace `selection.isActive()` with `selection.isThought()`. On desktop, create `Hello world`, select `Hello`, then click empty space: `document.activeElement` has moved to `body` while `window.getSelection().focusNode` still points into the editable, or into a formatting tag inside it. `isActive()` is true, `isThought()` is false, and a command whose input is merely the selected text stops firing after the first click elsewhere — with no error, and no visual change until the user presses the key that no longer does anything.

The three predicates live in [`selection.ts`](../../../src/device/selection.ts) and read two different sources. `isActive` is `!!window.getSelection()?.focusNode`. `isNote` and `isThought` default to `document.activeElement` and resolve an explicitly passed node through `getEditableCandidate`, which walks up out of text nodes and formatting tags to the element carrying the identifying attribute. [`Content`](../../../src/components/Content.tsx) is what that walk is for: it asks `isThought(e.target)` to decide whether a click landed on empty space, and without it a click inside a bold or coloured span answers no (#3805, #3911). `isThought` moved off `focusNode` onto `activeElement` in #3940, which is where the divergence above begins.

The #3919 audit set out to replace `isActive` with `isThought` everywhere and mapped the change call site by call site. The desktop case ended it: the two are not interchangeable, and with no automated coverage of notes the conclusion was to lock down the semantics and keep the helpers orthogonal rather than simplify a fragile area. `selection.ts` still carries `// We should see if it is possible to just use state.isKeyboardOpen and selection.isActive()` above `isThought`; the question is open, but it has been investigated once and rejected on this evidence.

## Guidance

| The feature | Predicate | Reads |
| --- | --- | --- |
| Requires the user to be able to **type** in the thought | `isThought()` | `document.activeElement` |
| Merely operates on the **selected text** | `isActive()` | `focusNode` |
| Runs inside `onBlur` | neither | `e.relatedTarget` |

Inside a blur handler both sources lie. `document.activeElement` has already moved to `body`, and `focusNode` is not updated synchronously, so it still describes the selection the blur is ending. Only `e.relatedTarget` names where focus is going, which is the distinction [Cursor and Caret § Edit mode across a momentary blur](../../cursor-and-caret.md#edit-mode-across-a-momentary-blur) turns on. The one predicate call on that path is [`Note`](../../../src/components/Note.tsx)'s `onBlur`, `if (!selection.isNote(e.relatedTarget))` — an earlier version made `document.activeElement` authoritative there and had to be rewritten once it turned out to report `body` during the blur while `relatedTarget` correctly named the incoming editable, leaving the "did focus move to another note?" test unable to ever be true.

`isThought()` returns true for a note as well. That is deliberate: of the call sites the audit enumerated, the majority wanted thought *and* note, so note-inclusiveness is the default and the one site that has to distinguish a note passes it an explicit node. The thought-only sites — [`Editable`](../../../src/components/Editable.tsx)'s `editingValueStore` resync effect and two guards in [`useEditMode`](../../../src/components/Editable/useEditMode.ts) — call bare `isThought()` and are correct only because a note renders its own `ContentEditable` and never mounts `Editable` or `useEditMode`, so those paths cannot run for a note. The exclusion is structural, not expressed. `isThought() && !isNote()` is the escape hatch if a thought-only site ever appears somewhere a note *can* reach; it appears nowhere in the tree today.

The `isThought()` bullet under [Cursor and Caret § Caret / Browser Selection](../../cursor-and-caret.md#caret--browser-selection) still describes the pre-#3940 implementation — "true if the focus node is inside a thought editable" — naming neither the `activeElement` basis nor the inclusion of notes. That is a `docs-sync` fix to that file, not something to work around from here.

## Why This Matters

This class of mistake cannot reproduce on mobile. There, the two predicates are aligned by construction: if and only if there is a selection, the keyboard is open and `document.activeElement` is on the Editable. A predicate swap that breaks desktop passes every mobile check, and the invariant that hides it does not hold inside `onFocus` or `onBlur` even on mobile.

There is also nothing to catch it. `isActive`, `isThought`, and `isNote` have no unit tests — [`src/device/__tests__/selection.ts`](../../../src/device/__tests__/selection.ts) covers only `offsetFromClosestParent` and `html`. That absence is why the audit stopped at semantics instead of simplifying, and it is the reason a wrong predicate reaches users as a command that quietly does nothing.

## When to Apply

Before writing any new guard over the browser selection, and before touching an existing one. The question to answer first is not "is there a selection?" but "does this feature need the user to be able to type?" — the predicate follows from that, and a guard whose author never asked it is the shape of the bug.

## Examples

**A guard that does not compute its stated intent.** [`deleteEmptyThoughtOrOutdent.ts`](../../../src/commands/deleteEmptyThoughtOrOutdent.ts) has `if (!selection.isActive() && selection.isText()) return false` in `canExecuteDeleteEmptyThought` and `(selection.isActive() || !selection.isText())` in `canExecuteOutdent`. `isText` already requires a focus node, so the first conjunction is unsatisfiable and the second is always true. The comment above the first records why `isActive` alone is insufficient — a selection object can exist with no `focusNode` — but not what the pair was meant to express. Both are still in the tree; the audit flagged them and deferred the archaeology rather than guessing an intent.

**A conjunction that only looks redundant.** [`commandStateStore.ts`](../../../src/stores/commandStateStore.ts) computes `selection.isActive() && selection.isThought()`. Because the two read different sources, it is not reducible to either half — it means "focus is on an editable *and* there is a live selection", and dropping a clause silently picks one of the two questions.

**A blur path no predicate reaches.** [`Editable`](../../../src/components/Editable.tsx)'s `onBlur` builds `isRelatedTargetEditableOrNote` inline from `hasAttribute?.('data-editable')` and `querySelector('[aria-label="note-editable"]')` rather than calling `selection.isThought(e.relatedTarget)`, so a change to `getEditableCandidate` would not reach it — and its note check is a descendant search where `isNoteEditable` is an equality test on the node itself. The same handler returns early on `globals.suppressBlurSync` before any of it runs.

**The counterexample's blast radius has narrowed, but not closed.** `Content` collapses a range on tap down when the target is not a thought (#4833), so on that one path the selected text is gone before a command could read it — see [Cursor and Caret § Mobile](../../cursor-and-caret.md#mobile) for why collapse rather than clear. `collapse` leaves `focusNode` set, so the divergence itself survives, and every other way of losing focus — a toolbar button, the browser chrome, another window — still reaches it.

## Related

- #3915 — the issue that proposed the refactor.
- #3919 — the audit that rejected it and settled the semantics instead.
- #3940 — `isThought` moved from `focusNode` to `activeElement`.
- #3911, #3805 — the parent-element check that makes a focus node inside a formatting tag resolve to its editable.
- [Cursor and Caret § Caret / Browser Selection](../../cursor-and-caret.md#caret--browser-selection) — the wrapper's full read/write catalogue, and the lint rule against calling `window.getSelection` directly.
- [Cursor and Caret § `useEditMode`](../../cursor-and-caret.md#useeditmode) — when the caret is placed, and the `!isThought()` clause that keeps the hook from stealing a correctly placed caret.
