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

- **Reads:** `isActive()`, `isCollapsed()`, `isText()`, `isThought()`, `isNote()`, `isOnFirstLine()`, `isOnLastLine()`, `isStartOfElementNode()`, `isEndOfElementNode()`, `offset()`, `offsetThought()`, `offsetFromNode()`, `offsetRange(editable)`, `offsetRangeThought(thoughtId)`, `text()`, `html()`, `getBoundingClientRect()`, `isNear(x, y, distance)`.
- **Writes:** `set(node, { offset?, end? })`, `setRange(node, { start, end })`, `clear()`, `select(el)`, `removeCurrentSelection()`.
- **Save/restore:** `save()` returns a `SavedSelection` opaque object; `restore(saved)` puts it back. Used when an action that re-renders the DOM, or a surface that takes focus, needs to hand the selection back afterwards. A range is restored as a range — `save` records the anchor end alongside the focus end whenever the selection is not collapsed — so a highlighted span survives the round-trip instead of coming back as a caret. This is what keeps a sub-range formatting command working when its picker is opened from the Command Universe, whose search input takes focus, and what keeps the user's selection intact across a Copy that stages rich content in a hidden contenteditable.
- **Split helpers:** `split(el)` and `splitNode(root, range)` return the HTML before/after the caret with formatting tags re-balanced. Used by the Split Sentences command, the Extract Subthought command, and by paste to cut out the text a selection replaces.

An edit that rewrites a thought's HTML addresses it by plain-text offset and resolves that offset through `offsetFromClosestParent`, never by indexing into the markup — a markup index cuts between two tag contexts and leaves a tag unclosed ([issue #5154](https://github.com/cybersemics/em/issues/5154)), and counts an HTML entity as as many characters as its markup is long ([issue #5297](https://github.com/cybersemics/em/issues/5297)). Paste does both halves that way: [`splitHtmlAtTextOffset`](../src/util/splitHtmlAtTextOffset.ts) removes the range the selection replaces, and [`insertHtmlAtTextOffset`](../src/util/insertHtmlAtTextOffset.ts) puts the pasted HTML in. They are not interchangeable — the split re-balances tags onto *both* halves, so composing the insertion as `left + pasted + right` would leave the pasted text outside the formatting both halves carry, splitting a bold run in two. The insertion instead lands inside the resolved text node, so it inherits the formatting there.

`set` always collapses the caret. To keep a *range* of text selected across a programmatic edit that re-renders the editable, capture it with `offsetRange(editable)` beforehand and restore it with `setRange(editable, range)` afterwards — both work in plain-text offsets, so nested formatting tags are handled for you. This is how the Letter Case command keeps the user's text selected ([issue #4840](https://github.com/cybersemics/em/issues/4840)). Offsets are only valid across an edit that preserves the text before them, so an edit that can change the length of the text has to map them: [`formatLetterCase`](../src/actions/formatLetterCase.ts) re-applies the letter case transform to the text preceding each offset, since `'ß'.toUpperCase()` is two characters. The restore has to wait for the re-render it is undoing, and a frame is not a reliable proxy for it: [`ContentEditable`](../src/components/ContentEditable.tsx) replaces the editable's contents from a passive effect, which can be flushed after the next animation frame, so a restore deferred with `requestAnimationFrame` can land on the old text and be wiped by the re-render, leaving nothing selected ([issue #4985](https://github.com/cybersemics/em/issues/4985)). `formatLetterCase` therefore observes the editable and restores the range on the mutation that produces the transformed text.

The two reads worth calling out:

- **`isOnFirstLine()` / `isOnLastLine()`** — used by the `cursorUp` and `cursorDown` commands so that pressing arrow at the bounds of a multi-line thought moves to the next thought rather than re-positioning the caret within the same thought.
- **`isThought()`** — true if the focus node is inside a thought editable; used pervasively as a guard before dispatching selection-changing actions.

Caret position is set via [`Editable`](../src/components/Editable.tsx)'s use of `selection.set`. The hook that actually decides *when* to set the selection is [`useEditMode`](#useeditmode), described below.

Notes own a separate contenteditable in [`Note`](../src/components/Note.tsx), so they restore their caret directly instead of using `useEditMode`. Each note edit captures the post-edit character offset relative to the note root with `offsetFromNode()` and carries it on the note's edit action (`editThought` for a literal note or `editNotePath` for a path-based note). The undo enhancer uses the edit's plain-text length change to retain the corresponding pre-edit offset. Undo and redo force the note to render, then `Note` reads the requested `state.noteOffset` non-reactively, places the caret, and clears that one-shot request without adding another undo entry. Keeping the offset non-reactive prevents an ordinary click or text selection from being overwritten by a render.

The document has exactly one browser selection, so a UI that takes the focus destroys the only record of what the user had selected. That is a problem for commands whose input *is* the selected text — Extract Subthought and Extract Category slice the cursor thought at the selection's character offsets — because the Command Universe focuses its search input as it opens, and by the time the user picks a command the live selection is a collapsed caret in that search box. Opening either Command Universe therefore dispatches [`saveSelectionOffsets`](../src/actions/saveSelectionOffsets.ts) first, which snapshots the offsets into `state.selectionOffsets` while the selection is still on the thought; the mobile flavor does it before the `selection.clear()` it performs on open. The snapshot survives the close, because the Command Universe closes itself before executing the chosen command.

Commands read the offsets back through [`selectionOffsets`](../src/selectors/selectionOffsets.ts), which prefers the live selection and falls back to the snapshot only when the selection has left the cursor thought and a snapshot was taken on it. Both paths measure with `offsetRange(editable)` against the thought's own editable, so the offsets are plain-text positions within the whole value rather than within whichever text node the selection happens to start in — the two only coincide when the value has no formatting to split it into several. Tying the snapshot to the thought it came from matters because a command executed from the Command Universe can move the cursor; without that check the next command would slice whichever thought the cursor landed on at offsets that index into a different string. The snapshot is never updated in real time — nothing subscribes to it, and it is written only when a Command Universe opens — so, like `state.noteOffset` above, it stays out of the render cycle. `undoRedoEnhancer` omits it from patches for the same reason it omits `isKeyboardOpen`: it is device state, and restoring a selection the user has moved on from is not part of undoing an edit.

### Desktop

On desktop, the caret is always on the cursor thought. Edit mode is implicit (the keyboard is always available), so `state.isKeyboardOpen` is effectively a no-op on desktop and the cursor change always pulls the caret along.

### Mobile

On mobile the caret is only set when the user has explicitly entered edit mode. While not editing, the user can move the cursor with taps and gestures without having the virtual keyboard pop up — which is what makes em navigable on mobile in the first place.

Edit mode is tracked by `state.isKeyboardOpen` (boolean), toggled via the [`keyboardOpen`](../src/actions/keyboardOpen.ts) action. When the user closes the virtual keyboard, `isKeyboardOpen` is set to `false`.

The two-tap pattern:

- By default, edit mode is off. Tapping a non-cursor thought moves the cursor but does **not** open the keyboard.
- Tapping the cursor thought a second time activates edit mode and opens the keyboard.
- Closing the keyboard (or navigating to the root) exits edit mode.
- While a multiselect is active, a tap on a thought or on its bullet toggles that thought's selection instead of moving the cursor. Deselecting the last selected thought ends the multiselect and restores the normal tap behavior. See [Multicursor](commands.md#multicursor).

There are also commands that activate edit mode by side effect, because they modify the visible thought: `newThought`, `newSubthought`, `clearText`, `subcategorizeOne`, etc.

The first tap suppresses edit mode by calling `preventDefault()` on its touchend (in `Editable`'s `handleTapBehavior`), which normally stops the browser from synthesizing the tap's mousedown/focus/click and thereby keeps the keyboard closed. iOS Safari sometimes fires those synthesized events anyway — e.g. when the touchend is not cancelable because the tap landed during scroll momentum — and by the time they arrive the tapped thought has already become the cursor, so the focus/mousedown handlers would read it as a second tap and open the keyboard. `globals.suppressFocusAfterCursorMove` closes this hole: `handleTapBehavior` sets it when a touchend moves the cursor or toggles the multiselect without entering edit mode, a capture-phase touchstart listener in [`initEvents`](../src/util/initEvents.ts) clears it (a new touch proves the user actually tapped again), and while it is set, `Editable`'s `onFocus` dismisses the focus (same treatment as the long-press quirk, [#3387](https://github.com/cybersemics/em/issues/3387)) and `useEditMode`'s mousedown handler drops the event. Suppression is bypassed when `state.isKeyboardOpen` is already true so that commands which activate edit mode by side effect can still focus programmatically.

The same unreliable suppression means the tap's click can reach `Editable` itself: `handleTapBehavior` is registered on both `touchend` and `click`, so a press that Safari does not treat as a quick tap — held longer than a tap but shorter than a long press, on a large thoughtspace — would run it twice and, while a multiselect is active, toggle the thought's selection off again immediately after selecting it. `Editable` therefore records the time of each touchend that ran `handleTapBehavior` and, while a multiselect is active, drops a click that follows it within `TAP_CLICK_TIMEOUT` (100 ms, measured against a synthesized click that arrives 1–64 ms after its touchend and a fastest double tap of 100 ms). A touchstart clears the recorded time, on the same reasoning as the capture-phase listener above: a new touch proves that the next click belongs to it rather than to the previous tap, which keeps the second tap of a fast double tap working even when its own touchend does not reach `handleTapBehavior`. The guard is limited to the multiselect toggle because the tap's other behaviors are idempotent: running them twice is harmless, and dropping the click unconditionally would interfere with the two-tap pattern above. It does not apply while the multiselection is being edited, where a tap places the caret as usual (see [Multi edit mode](#multi-edit-mode)).

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
- No multicursor selection is active, *unless* the multiselection is cleared (see [Multiselect faux caret](#multiselect-faux-caret)), in which case the caret is placed on the first cleared thought.
- We're not in `LongPressState.DragHold` (the user is mid-long-press; don't hijack their selection).
- The hook hasn't been temporarily disabled via `allowDefaultSelection` (see below).

When all conditions pass, the hook calls `selection.set(contentRef.current, { offset: cursorOffset ?? 0 })`. Several platform workarounds are layered in here:

- **Hidden-thoughts guard.** If `style.visibility === 'hidden'`, the hook calls `selection.clear()` instead of setting — otherwise switching tabs and back can fire a faulty focus event ([issue #1596](https://github.com/cybersemics/em/issues/1596)).
- **Auto-Capitalization.** When a thought is created on iOS Safari, the Shift key needs to be on at the moment the selection is set — but synchronous selection-setting breaks Auto-Capitalization ([issue #999](https://github.com/cybersemics/em/issues/999)). Calling [`asyncFocus()`](#asyncfocusts) before the set fixes it. Doing this only when the existing selection isn't already on a thought avoids the infinite-loop case with nested empty thoughts. Because `asyncFocus` parks the focus on its dummy input, the hook then focuses the editable explicitly: setting the browser selection focuses the editing host implicitly *only when nothing else holds the focus*, so without this the focus stays stranded on the dummy input — WKWebView never raises the keyboard for the editable, no caret renders, and `document.hasFocus()` stays `false`, which trips the page-lifecycle handler in [`initEvents`](../src/util/initEvents.ts) into clearing the selection 10 ms later and dismissing the keyboard ([PR #4692](https://github.com/cybersemics/em/pull/4692)).
- **Keyboard stability during rapid edits.** [`requestAnimationFrame`](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame) is used instead of `setTimeout` (in some places) to keep the keyboard from flickering closed during rapid delete sequences ([issue #3129](https://github.com/cybersemics/em/issues/3129)). For `swapParent` and `swapGrandparent`, the selection is set synchronously to keep focus stable across the swap.
- **Android keyboard activation.** Android raises the virtual keyboard in response to a tap, not to the caret being placed programmatically, so a command that activates edit mode by side effect — Clear Thought, `newThought`, etc. — would leave the caret in the thought with no keyboard ([issue #4686](https://github.com/cybersemics/em/issues/4686)). Before setting the selection the hook calls [`virtualKeyboard.show(editable)`](../src/device/virtual-keyboard/index.ts), which raises the native keyboard via the Keyboard plugin in the Capacitor app and focuses the editable by script on Android mobile web (Chromium raises the keyboard for a script-initiated focus during user activation, but not for the implicit focus that setting the selection performs). It must run _before_ `selection.set`, because setting the selection focuses the editing host implicitly, which makes a later `focus()` a no-op. It is gated on `editMode` so that the keyboard is never re-opened after the user manually dismissed it ([issue #3996](https://github.com/cybersemics/em/issues/3996)). Alongside it the hook focuses the editable directly, because `selection.set` focuses the editing host *implicitly* — that is, only when nothing else already holds the focus. [`asyncFocus()`](#asyncfocusts) parks the focus on a hidden input, so after a drag-and-drop, which leaves the selection cleared, the implicit focus lands on neither the editable nor anything else and the caret, the faux carets and the keyboard all fail to appear ([PR #4520](https://github.com/cybersemics/em/pull/4520)). The iOS Capacitor app needs the same script-initiated focus: WKWebView normally focuses the editing host from the programmatic selection, but not once the keyboard has been dismissed programmatically — as it is by the `selection.clear()` that runs when undo removes the cursor thought — leaving the next thought with no caret and no keyboard ([issue #4869](https://github.com/cybersemics/em/issues/4869)). Focusing before `selection.set` is a no-op when the editable already has the focus, which is the ordinary case.

`useEditMode` returns an `allowDefaultSelection` callback. Calling it disables the hook for one tick, which lets the user click somewhere else inside a thought (e.g. to position the caret in the middle of a non-cursor thought) without the hook stomping their click. Used by `Editable`'s click handler.

### Edit mode across a momentary blur

`editMode` is `!isTouch || state.isKeyboardOpen`, so on touch **every** caret placement the hook performs is gated on `isKeyboardOpen` being an accurate reflection of whether the virtual keyboard is up. `Editable`'s `onBlur` is what sets it to `false`, and it must therefore distinguish a blur that genuinely ends editing from one that does not:

- **Focus moving to another editable or note** — detected from `e.relatedTarget`.
- **The iOS autocomplete focus retarget** — after `insertReplacementText`, focus is bounced to the [`asyncFocus`](#asyncfocusts) dummy input and straight back to the same editable to clear the touch dead zone ([issue #4222](https://github.com/cybersemics/em/issues/4222)). Its `relatedTarget` is a bare `<input>`, so the check above cannot see it; [`globals.suppressBlurSync`](../src/globals.ts), which the retarget sets for the duration, is what marks it.

Both cases return early, before any of the end-of-editing resets (`editingValueStore`, `cursorCleared`, `keyboardOpen`). Getting this wrong is silent and long-range: `isKeyboardOpen` is left `false` while the keyboard is still visibly up, and nothing restores it until an unrelated action happens to set it (`newThought`, `setCursor`). Meanwhile `useEditMode` stops placing the caret entirely, so the next re-render that replaces the editable's `innerHTML` — undo being the common one — leaves the caret at the beginning of the thought ([PR #4692](https://github.com/cybersemics/em/pull/4692)). `FauxCaret`, `NavBar`, `LayoutTree`, and `Tip` read the same flag and are wrong for just as long.

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

### `caretRectStore`

[`src/stores/caretRectStore.ts`](../src/stores/caretRectStore.ts).

A non-Redux ministore tracking the geometry of the real caret — its x, y, and height relative to the focused thought — or all `null` when no thought is focused. Like `selectionRangeStore` it is updated from the `selectionchange` handler in [`initEvents`](../src/util/initEvents.ts), but unthrottled, so that a faux caret driven by it does not visibly lag the real caret while typing. It is measured again on `input`, since a deletion moves the caret without the browser firing another `selectionchange` once the new text has been laid out. The store exports the measurement itself as `updateCaretRect`, which only measures the caret in [multi edit mode](#multi-edit-mode), since that is its sole consumer (the multiselect faux caret below).

A programmatic replacement of the rendered text fires neither event, so `MulticursorFauxCaret` calls `updateCaretRect` again whenever the value of the thought that holds the caret changes. Undo and redo do exactly that, and would otherwise leave the faux carets at the offset of the text that was replaced.

`selection.caretRect()` falls back to the start of the editable's content box when the caret has no client rect of its own, which is the case on an empty thought, where the browser selection is on the element node rather than a text node. The fallback height is one line rather than the height of the editable: a cleared thought renders its value as a placeholder, so it can be several lines tall while the caret within it is not.

Geometry is mirrored rather than the character offset because the thought that holds the real caret and the thoughts that render a faux caret do not always contain the same text: the mirrored value is trimmed, and while the thoughts are cleared the overlaid editable is empty. Laying out a copy of the text to find the offset's position therefore drifted from the real caret. `selection.caretRect()` asks the browser where the caret actually is, so the faux carets agree with it by construction, including inside formatted text and across line wraps.

### Multiselect faux caret

[Clear Thought](../src/commands/clearThought.ts) works on a multiselection: it clears every selected thought and keeps the multicursors alive so that subsequent typing is mirrored to all of them by `Editable`'s `onChangeHandler`, which dispatches an `editThought` per selected thought on every keystroke rather than through the edit throttle, so that they stay in sync character by character. Only one thought can hold the real browser caret, so the others render a faux caret to show that they are being edited too.

`Editable` renders [`MulticursorFauxCaret`](../src/components/MulticursorFauxCaret.tsx) when the path is a multicursor member, is not the cursor, and the cursor itself is a multicursor member. It is an absolutely positioned [`FauxCaret`](../src/components/FauxCaret.tsx) placed at `caretRectStore`'s x and y within the thought, sized to the caret's height, so it appears at the same position within its thought as the real caret does within its own.

It is rendered as a sibling *after* the `ContentEditable`, and always in the same position in the element tree, so that toggling it does not change the shape of `Editable`'s output. Wrapping or preceding the editable would make React recreate the editable's DOM node when the faux caret appears, silently detaching the native `mousedown` listener that `useEditMode` binds to it — which is what stops a tap from moving the caret.

### Multi edit mode

[`isMultiEditing`](../src/selectors/isMultiEditing.ts) is true when a multiselection is actually being *edited*: the keyboard is open, the cursor is a multicursor member, and the caret is in the cursor thought. Only Clear Thought puts the app in this state (via `useEditMode`'s relaxed multicursor guard); an ordinary multiselection leaves the caret outside any editable, so the predicate consults the DOM selection to tell the two apart. The commands that start or extend an ordinary multiselection uphold that by clearing the browser selection — [`selectAll`](../src/commands/selectAll.ts) as soon as it selects the thoughts, `cursorUp`/`cursorDown` on the next animation frame. A caret left behind in the cursor thought would otherwise read as multi edit mode, and the selection that [Copy Cursor](../src/commands/copyCursor.ts) saves and restores around the clipboard write would re-focus the editable and render a faux caret on every selected thought.

The caret is checked against the cursor thought specifically, not merely against some thought. Shift + ArrowUp/ArrowDown moves the cursor onto the next thought and only takes the caret out of the thought the multiselect started from on the following animation frame, so for that frame the caret is in a thought that is not the cursor. Accepting any thought would read that as multi edit mode and make every command below defer to the browser — most visibly Escape, which would exit an editing session that was never entered and leave the multiselection standing.

Commands and gestures that otherwise take over the interaction defer to native editing behavior in this state:

- [`deleteEmptyThoughtOrOutdent`](../src/commands/deleteEmptyThoughtOrOutdent.ts) normally executes whenever a multiselection exists. In multi edit mode it executes only when `canExecuteDeleteEmptyThought` holds — i.e. the caret is at the start of an empty thought, in which case the deletion is propagated to all selected thoughts. Otherwise it declines, letting the browser delete a character and the edit mirror like any other.

  A cleared thought counts as empty even before it is edited, so Backspace immediately after Clear Thought deletes the whole multiselection. This relies on the cleared state outliving the multicursor traversal: [`executeCommandWithMulticursor`](../src/commands.ts) sets the cursor to each selected thought in turn, and `setCursor` normally resets `cursorCleared` on navigate. It therefore preserves it while `isMulticursorExecuting`, and resets it once the command completes — otherwise every path but the first would look non-empty and the thoughts would be merged instead of deleted.
- [`selectAll`](../src/commands/selectAll.ts) (Cmd + A) likewise declines, so the browser's native select-all applies to the text being edited rather than selecting all thoughts.
- [`cursorBack`](../src/commands/cursorBack.ts) (Escape) exits multi edit mode — restoring the cleared values and closing the keyboard — while leaving the multiselection intact. A second Escape then clears the multiselection, so the two are undone in the order they were applied. The command's Clear Thought guard checks `isMultiEditing` in addition to `cursorCleared`, since the first edit resets the cleared state (see `editThought`) while the multiselection is still being edited.
- Tapping a thought moves the caret as it does when editing a single thought, rather than being swallowed to preserve the multiselection: `Editable`'s tap handler and `useEditMode`'s `onMouseDown` both make an exception for multi edit mode, and the latter sets the caret with `preserveMulticursor` so that the tap does not dismiss the selection.

On mobile, the Command Center normally opens whenever a multiselection is active ([`multicursorAlertMiddleware`](../src/redux-middleware/multicursorAlertMiddleware.ts)). It stays closed while the keyboard is open — i.e. while the multiselection is being edited — both so that the sheet does not cover the editing session and because iOS dismisses any focus that arrives while the Command Center is shown (see `onFocus` in `Editable`), which would prevent the keyboard from ever opening. The middleware also ignores the multicursors entirely while `isMulticursorExecuting` is set, since the command loop empties and restores them (see [commands.md → Multicursor](commands.md#multicursor)) — without that, the first restored multicursor looks like a fresh multiselection and re-opens the Command Center. Space is bound to `indent`, so this happens on every space typed during multi edit mode even though the space-to-indent guard bails. `clearThought` reserves the focus with `asyncFocus` during the original touch event, since iOS Safari otherwise ignores the asynchronous `selection.set` that `useEditMode` performs after the render. When the keyboard closes, the blur ends the editing session: it resets the cleared state and, when the blurred thought is a multicursor member, clears the multiselection as well. Otherwise the surviving multicursors would trip the middleware as soon as the keyboard closed, re-opening the Command Center over the thoughtspace the moment the user dismissed the keyboard. When the keyboard closes, the blur ends the editing session: it resets the cleared state and, when the blurred thought is a multicursor member, clears the multiselection as well. Otherwise the surviving multicursors would trip the middleware as soon as the keyboard closed, re-opening the Command Center over the thoughtspace the moment the user dismissed the keyboard.

### `preventAutoscroll.ts`

[`src/device/preventAutoscroll.ts`](../src/device/preventAutoscroll.ts).

When `selection.set` runs on a thought that's near the bottom of the viewport, the browser will sometimes scroll the editable into view. This is fine in theory but can fight with em's own viewport autocrop logic and produce a jumpy keyboard. `preventAutoscroll` temporarily applies CSS that puts the element near the viewport center (so the browser thinks no scroll is needed), restores the original styles after a 10 ms timeout, and is invoked by `useEditMode` before `selection.set`.

Because the temporary CSS inflates the editable's padding, any height measured during the autoscroll window is too large. `getAutoscrollPadding(el)` returns the number of pixels of padding currently added to an element so that `VirtualThought.updateSize` can subtract it and record the thought's true height even during the window. Without this, a height change that occurs during the window — e.g. a note added by Swap Note — would be recorded with an inflated height or skipped entirely, leaving the next thought overlapping the note ([#4279](https://github.com/cybersemics/em/issues/4279)).

## Testing

All browser-selection testing should happen in puppeteer e2e tests, since they run against a real browser whose selection API behaves correctly.

In `react-testing-library` / JSDOM, the selection API is partially mocked but does not produce realistic behavior — `selection.isOnLastLine`, `setSelectionRange`, and `getBoundingClientRect` against a `Range` are unreliable. Don't write selection-dependent assertions there; use the puppeteer suite instead. See [testing.md](testing.md) for how the puppeteer harness is set up.
