# Cursor and Caret

Because **em** is a custom editor — not a textarea, not a contenteditable region the browser fully owns — controlling the browser selection precisely is a load-bearing concern. Misplaced carets, vanished keyboards, and intermittent focus loss are easy to introduce. This document defines the terminology, explains how the **cursor** (em's notion of "the active thought") and the **caret** (the browser's text-selection caret) interact, and walks through the files that own each piece of the puzzle.

## Terminology

- **Caret** (or "text cursor"). The vertical line that the browser renders inside an editable element to mark the insertion point. Sometimes called the "cursor" colloquially, but in this codebase **never** — that name is reserved for em's cursor thought.
- **Browser selection.** The full `window.getSelection()` object, which has start and end offsets. When start equals end, the selection is *collapsed* and the caret is just the insertion point. When start differs from end, the user has actively selected text.
- **Focus node.** The DOM node that holds the active selection. Usually a `TEXT_NODE` while editing, but can be an `ELEMENT_NODE` (e.g. when the caret is between rather than within text nodes).
- **Offset.** If the focus node is a `TEXT_NODE`, this is a character offset. If it's an `ELEMENT_NODE`, it is the *index of the child node* before the caret (so `offset: 1` on an element means the caret is *after* the first child, not after the first character). Treat element-node offsets and text-node offsets as different things.
- **Cursor** (or "cursor thought"). em's notion of the active thought, stored as a `Path` in `state.cursor`. Indicated visually by a gray circle around the bullet. The cursor is the focal point of every command — Delete operates on the cursor thought, New Subthought adds a child of the cursor thought, autofocus fades and reveals thoughts relative to the cursor, etc.

## Cursor

The cursor is stored as `state.cursor: Path | null`. Only one thought has the cursor at a time. The cursor is **not** the browser selection — they're independent pieces of state that the system carefully keeps in sync.

To move the cursor, dispatch [`setCursor`](../src/actions/setCursor.ts):

```ts
dispatch(setCursor({ path: newPath, offset: 5 }))
```

`setCursor` does **not** set the browser selection directly — it stores `path` (and `offset`, in `state.cursorOffset`) so the next time an `Editable` is rendered for that path, it can place the caret at the requested offset. This split lets the cursor change in response to keyboard navigation without forcibly re-grabbing the caret on every render (which would interrupt typing).

![image](https://user-images.githubusercontent.com/750276/151666504-8548ed98-515c-4894-856a-994af38203e0.png)

## Caret / Browser Selection

The caret is the native browser selection — `window.getSelection()`. We use the name "caret" because it's shorter and unambiguous. Unless otherwise noted, "caret" means a *collapsed* browser selection.

All access to the browser selection API goes through [`device/selection.ts`](../src/device/selection.ts). A lint rule prevents calling `window.getSelection` directly elsewhere; do not disable it. The wrapper exists to:

- Hide browser-specific differences behind a clean API.
- Make it possible to mock the selection in tests.
- Keep DOM walking and edge-case handling (formatting tags, text-vs-element nodes, padding) in one place.

The `selection.ts` module groups its functions roughly into:

- **Reads:** `isActive()`, `isCollapsed()`, `isText()`, `isThought()`, `isNote()`, `isOnFirstLine()`, `isOnLastLine()`, `isStartOfElementNode()`, `isEndOfElementNode()`, `offset()`, `offsetThought()`, `offsetStart()`, `offsetEnd()`, `text()`, `html()`, `getBoundingClientRect()`, `isNear(x, y, distance)`.
- **Writes:** `set(node, { offset?, end? })`, `clear()`, `select(el)`, `removeCurrentSelection()`.
- **Save/restore:** `save()` returns a `SavedSelection` opaque object; `restore(saved)` puts it back. Used when an action that re-renders the DOM needs to preserve the caret across the render.
- **Split helpers:** `split(el)` and `splitNode(root, range)` return the HTML before/after the caret with formatting tags re-balanced. Used by the Split Sentences command and the Extract command.

The two reads worth calling out:

- **`isOnFirstLine()` / `isOnLastLine()`** — used by the `cursorUp` and `cursorDown` commands so that pressing arrow at the bounds of a multi-line thought moves to the next thought rather than re-positioning the caret within the same thought.
- **`isThought()`** — true if the focus node is inside a thought editable; used pervasively as a guard before dispatching selection-changing actions.

Caret position is set via [`Editable`](../src/components/Editable.tsx)'s use of `selection.set`. The hook that actually decides *when* to set the selection is [`useEditMode`](#useeditmode), described below.

### Desktop

On desktop, the caret is always on the cursor thought. Edit mode is implicit (the keyboard is always available), so `state.isKeyboardOpen` is effectively a no-op on desktop and the cursor change always pulls the caret along.

### Mobile

On mobile the caret is only set when the user has explicitly entered edit mode. While not editing, the user can move the cursor with taps and gestures without having the virtual keyboard pop up — which is what makes em navigable on mobile in the first place.

Edit mode is tracked by `state.isKeyboardOpen` (boolean), toggled via the [`keyboardOpen`](../src/actions/keyboardOpen.ts) action. When the user closes the virtual keyboard, `isKeyboardOpen` is set to `false`.

The two-tap pattern:

- By default, edit mode is off. Tapping a non-cursor thought moves the cursor but does **not** open the keyboard.
- Tapping the cursor thought a second time activates edit mode and opens the keyboard.
- Closing the keyboard (or navigating to the root) exits edit mode.

There are also commands that activate edit mode by side effect, because they modify the visible thought: `newThought`, `newSubthought`, `clearText`, `subcategorizeOne`, etc.

### `useEditMode`

[`useEditMode`](../src/components/Editable/useEditMode.ts) is the declarative hook that lives inside every `Editable`. It does the work of "if this thought should have the caret right now, set it." Each `Editable` instance runs the hook, but the conditions inside ensure that exactly one thought (the cursor thought, or a transient editable) actually claims the caret.

The conditions for setting the selection are roughly:

- `isEditing` — the thought is the current cursor target, or
- `transient` — a transient editable (e.g. a freshly created thought before its `setCursor` has flushed)

AND the following are all true:

- `editMode` is true (i.e. `!isTouch || state.isKeyboardOpen`).
- Not in note focus (`!state.noteFocus`).
- The element ref is mounted.
- A `cursorOffset` is set, *or* the existing selection is not on a thought (so we don't steal the caret if it's already correctly placed).
- No multicursor selection is active.
- We're not in `LongPressState.DragHold` (the user is mid-long-press; don't hijack their selection).
- The hook hasn't been temporarily disabled via `allowDefaultSelection` (see below).

When all conditions pass, the hook calls `selection.set(contentRef.current, { offset: cursorOffset ?? 0 })`. Three Mobile Safari workarounds are layered in here:

- **Hidden-thoughts guard.** If `style.visibility === 'hidden'`, the hook calls `selection.clear()` instead of setting — otherwise switching tabs and back can fire a faulty focus event ([issue #1596](https://github.com/cybersemics/em/issues/1596)).
- **Auto-Capitalization.** When a thought is created on iOS Safari, the Shift key needs to be on at the moment the selection is set — but synchronous selection-setting breaks Auto-Capitalization ([issue #999](https://github.com/cybersemics/em/issues/999)). Calling [`asyncFocus()`](#asyncfocusts) before the set fixes it. Doing this only when the existing selection isn't already on a thought avoids an infinite loop with nested empty thoughts.
- **Keyboard stability during rapid edits.** [`requestAnimationFrame`](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame) is used instead of `setTimeout` (in some places) to keep the keyboard from flickering closed during rapid delete sequences ([issue #3129](https://github.com/cybersemics/em/issues/3129)). For `swapParent`, the selection is set synchronously to keep focus stable across the swap.

`useEditMode` returns an `allowDefaultSelection` callback. Calling it disables the hook for one tick, which lets the user click somewhere else inside a thought (e.g. to position the caret in the middle of a non-cursor thought) without the hook stomping their click. Used by `Editable`'s click handler.

There is also a small effect that re-focuses the editable when the sidebar closes on desktop, so editing resumes seamlessly.

**Prefer `useEditMode` over manually calling `selection.set`.** The hook handles ordering, edge cases, and platform quirks; manual calls tend to introduce subtle inconsistencies. There are still cases where manual selection is unavoidable (e.g. after a programmatic content edit), but those are minimized.

## Philosophy

Browser selection is unforgiving. Touch events vs. click events, automatic scroll-to-selection on mobile, long-press text selection, magnifying glasses, IME composition — these all conspire to make any direct manipulation of selection fragile. Two rules:

- **Be declarative.** Use a hook or middleware that automatically sets the selection when the conditions are right (`useEditMode` is the canonical example). Avoid one-shot calls that nudge the selection inside event handlers — they accumulate, and the order in which they fire is hard to reason about.
- **No `setTimeout` band-aids.** It is tempting to wrap a flaky selection update in a 0ms `setTimeout`. This is almost never the right fix. It introduces a frame of latency, races with other timeouts, and tends to mask the real issue (which is usually that the selection was already being set elsewhere by a competing handler). When you need to defer to the next paint, use `requestAnimationFrame`.

## Selection-related files

### `selection.ts`

[`src/device/selection.ts`](../src/device/selection.ts).

The full `window.getSelection()` wrapper. Adding a new selection-shaped helper here is preferred over reaching for `window.getSelection` in feature code. Get to know the methods listed in [Caret / Browser Selection](#caret--browser-selection) and extend the file when you need something new.

### `useEditMode.ts`

[`src/components/Editable/useEditMode.ts`](../src/components/Editable/useEditMode.ts).

The declarative selection-setting hook used by every `Editable`. See [`useEditMode`](#useeditmode) above.

### `asyncFocus.ts`

[`src/device/asyncFocus.ts`](../src/device/asyncFocus.ts).

Mobile Safari restricts programmatic `focus()` and `setSelection()` to direct descendants of click/touch event handlers. If you call them inside an asynchronous callback (e.g. after `await`), they silently no-op. The workaround is to keep an invisible disabled `<input>` element pinned to the document body, briefly enable + focus it during the user's touch event, and then run the real focus asynchronously. Once an active selection exists, Safari allows further programmatic changes.

`asyncFocus()` is a singleton — call it from inside a click/touch handler before the action fires, and the next async focus will work. It's a no-op on non-touch platforms and on focus targets that are already inside a thought (to avoid the infinite-loop case in `useEditMode`).

### `clearSelection.ts`

[`src/redux-middleware/clearSelection.ts`](../src/redux-middleware/clearSelection.ts).

A Redux middleware that listens to every action and clears the browser selection when:

- The cursor is `null` and the selection is currently on a thought.
- The cursor is on a divider thought.
- The cursor is on a root child reached via the context view (`isRoot(cursor.slice(-1))`).

This catches cases where the cursor moves but no `Editable` re-renders to pull the caret along — e.g. dismissing a divider with arrow keys, or navigating into a context-view root.

### `selectionRangeStore`

[`src/stores/selectionRangeStore.ts`](../src/stores/selectionRangeStore.ts).

A non-Redux ministore tracking whether there is an active *non-collapsed* selection range — i.e. whether the user has selected text. It is updated from a `selectionchange` event handler (throttled by `SELECTION_CHANGE_THROTTLE`) and is always `false` on desktop.

The main consumer is [`useDragAndDropThought`](../src/hooks/useDragAndDropThought.tsx)'s `canDrag`: when the user has a text range selected on touch, dragging is disabled so they can use the iOS magnifier and copy/paste UI without inadvertently starting a drag. See [drag-and-drop.md](drag-and-drop.md).

### `preventAutoscroll.ts`

[`src/device/preventAutoscroll.ts`](../src/device/preventAutoscroll.ts).

When `selection.set` runs on a thought that's near the bottom of the viewport, the browser will sometimes scroll the editable into view. This is fine in theory but can fight with em's own viewport autocrop logic and produce a jumpy keyboard. `preventAutoscroll` temporarily applies CSS that puts the element near the viewport center (so the browser thinks no scroll is needed), restores the original styles after a 10 ms timeout, and is invoked by `useEditMode` before `selection.set`.

## Testing

All browser-selection testing should happen in puppeteer e2e tests, since they run against a real browser whose selection API behaves correctly.

In `react-testing-library` / JSDOM, the selection API is partially mocked but does not produce realistic behavior — `selection.isOnLastLine`, `setSelectionRange`, and `getBoundingClientRect` against a `Range` are unreliable. Don't write selection-dependent assertions there; use the puppeteer suite instead. See [testing.md](testing.md) for how the puppeteer harness is set up.
