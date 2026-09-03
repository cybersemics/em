# Commands

There are about 80 commands within the app that are available to the user for editing, navigating, and other activities. Each can be activated with a toolbar button, keyboard shortcut, and/or gesture. The Command Universe brings up a list of all commands on desktop (Command/Ctrl + P).

Source of truth: [`../src/commands/`](../src/commands).

## Architecture

Every command is a single object that implements the [`Command`](../src/@types/Command.ts) interface, exported from a file under [`src/commands/`](../src/commands). The barrel file [`src/commands/index.ts`](../src/commands/index.ts) re-exports all of them, and [`src/commands.ts`](../src/commands.ts) imports the barrel as `* as commandsObject`. There is no registration step — adding a `*.ts` file to `src/commands/` and exporting it from the barrel is enough for the new command to participate in keyboard, gesture, toolbar, and Command Universe activation.

### Command shape

The minimal shape ([`Command.ts`](../src/@types/Command.ts)):

```ts
interface Command {
  // required
  id: CommandId
  label: string
  exec: (dispatch, getState, e, { type }) => void | Promise<void>
  multicursor: boolean | { /* see below */ }

  // optional
  description?: string | (state) => string
  keyboard?: Key | Key[] | string
  gesture?: Gesture | Gesture[]
  canExecute?: (state) => boolean
  isActive?: (state) => boolean
  svg?: (icon) => React.ReactNode
  // ...and more
}
```

A real example, abridged from [`pin.ts`](../src/commands/pin.ts):

```ts
const pinCommand = {
  id: 'pin',
  label: 'Pin' as const,
  labelInverse: 'Unpin',
  description: 'Pins open a thought so its subthoughts are always visible.',
  keyboard: { key: 'p', meta: true, alt: true },
  svg: PinIcon,
  canExecute: state => !!state.cursor || hasMulticursor(state),
  multicursor: {
    onComplete(filteredCursors, dispatch) {
      dispatch(alert(`Pinned ${pluralize('thought', filteredCursors.length, true)}.`))
    },
  },
  exec: (dispatch, getState, e, { type }) => {
    /* dispatch pin() */
  },
  isActive: state => !!isPinned(state, head(/* ... */)),
} satisfies Command
```

The `satisfies Command` and the `as const` on the label are load-bearing rather than stylistic. Annotating the constant `: Command` instead would type it as the interface, discarding what each command actually says about itself; `satisfies` checks the object against the interface while keeping the inferred type. The label needs `as const` on top of that, because the interface types `label` as `string` and that contextual type widens the literal even under `satisfies`. Together they let [`CommandLabel`](../src/@types/CommandLabel.ts) be derived as the union of every command's label, the same way [`CommandId`](../src/@types/CommandId.ts) is derived from the barrel's keys, so neither type has to repeat what the commands already declare. A command that skips either one widens its label to `string` and collapses that union. Rather than let that pass silently, `CommandLabel` resolves to a message naming the fix, so every call site that passes a label fails to compile and reports it.

`exec` receives the Redux `dispatch`, a `getState` thunk, the event that triggered the command, and a `{ type }` field that is `'keyboard'`, `'gesture'`, `'toolbar'`, or `'chainedGesture'` so the command can adapt its behavior (e.g. `pin` shows an alert only when triggered via keyboard, since the toolbar already gives visual feedback).

A command bound to an array of keyboard shortcuts also receives `keyboardIndex`, the index within that array of the shortcut that was pressed (`undefined` when the command was not activated by one of its own keyboard shortcuts). This lets one command cover a family of related shortcuts: `applyColor` maps Command/Ctrl + Option/Alt + *n* and Option/Alt + *n* to the *n*th text and background swatch of the [`ColorPicker`](../src/components/ColorPicker.tsx). Since only the first shortcut of an array is displayed, such a command can set `keyboardDisplay` to a single `Key` representing the whole range (`applyColor` displays `Cmd + Option + 0-8`).

### Discovery and indexing

At startup, [`commands.ts`](../src/commands.ts) flattens the barrel into `globalCommands: Command[]` and builds three indices via `index()`:

- **`commandKeyIndex`** — `hash(keyboard) → Command`. Used by `keyDown` for O(1) shortcut lookup.
- **`commandIdIndex`** — `id → Command`. Used by `commandById(id)`. Use this only when the id is dynamic; otherwise prefer a static import.
- **`commandGestureIndex`** — `gestureSequence → Command`. Used by `handleGestureEnd` for O(1) gesture lookup.

If two commands share the same keyboard hash, `index()` logs a `console.error` at startup naming both — so collisions surface early.

### Keyboard activation

The global `keyDown` handler (registered by [`initEvents.ts`](../src/util/initEvents.ts)) hashes the event with `hashKeyDown(e)`:

```
(meta|ctrl ? 'META_' : '') + (alt ? 'ALT_' : '') + (mac && ctrl ? 'CONTROL_' : '') + (shift ? 'SHIFT_' : '') + key.toUpperCase()
```

Hashes are uppercased, modifier-prefixed strings — so `Cmd+Shift+P` becomes `META_SHIFT_P`. `commandKeyIndex[hash]` resolves the command in O(1).

`Key.control` is the only modifier whose physical key differs by platform beyond the usual Command/Ctrl and Option/Alt substitution: on non-Mac platforms Ctrl already serves as `meta`, so `control` falls back to Shift and `hashCommand` emits `SHIFT_` for it. `heading0`–`heading5` are therefore Command + Option + Control + *n* on Mac and Ctrl + Alt + Shift + *n* elsewhere, which keeps them distinct from the text color shortcuts (Command/Ctrl + Option/Alt + *n*). `parseCommandShortcut`, which lets the Command Universe be searched by shortcut, applies the same platform mapping, so typing a command's shortcut exactly as it is displayed always resolves to that command.

The handler also:

- Skips entirely if `state.showDesktopCommandUniverse` is open.
- Skips when a modal is showing, *unless* the command has `allowExecuteFromModal: true` (e.g. navigation commands that should still work).
- Calls `e.preventDefault()` before dispatching, *unless* `command.permitDefault` is set. (`command.preventDefault` forces a preventDefault even when `canExecute` returns false.)
- Routes through `executeCommandWithMulticursor`, which short-circuits to `executeCommand` if no multicursor is active.

`keyDown` is a `window` listener, so a React handler that calls `stopPropagation` shadows every command bound to that key. [`Note`](../src/components/Note.tsx) does exactly that for the keys that navigate its own contenteditable — Escape and ArrowUp exit the note, Backspace deletes an empty one, ArrowDown moves the cursor down — so it only claims a keypress that carries no command modifier. A chord that includes Command/Ctrl or Option belongs to a command rather than to the note, and is left to propagate ([issue #4954](https://github.com/cybersemics/em/issues/4954)).

There's a special case in `beforeInput` for `newThought` and `indent` to handle iOS auto-capitalization: the Enter / space character is prevented in the `beforeinput` event rather than `keydown` ([issue #3707](https://github.com/cybersemics/em/issues/3707)). Another branch in `beforeInput` handles Android: soft keyboards report the space keydown as `keyCode 229` (`'Unidentified'`), so it never matches the `indent` command in `keyDown` and `keyCommandId` is never set — the branch catches the `beforeinput` `insertText` of a single space over an empty thought and dispatches `indent` directly ([issue #4178](https://github.com/cybersemics/em/issues/4178)).

`beforeInput` also intercepts native undo/redo, delegating to `handleNativeHistory`. iOS shake-to-undo and the three-finger swipe fire a cancelable `beforeinput` with `inputType` `historyUndo` / `historyRedo` rather than a `keydown`, so the Cmd+Z path never sees them. Left to run natively, the browser mutates the contenteditable directly and bypasses em's undo, leaving the DOM out of sync with Redux ([issue #3954](https://github.com/cybersemics/em/issues/3954)). The branch prevents the native operation and dispatches em's `undo` / `redo` instead. Like `keyDown`, it first triggers `commandEmitter` to flush the pending throttled edit — editing dispatches `editThought` on a throttle, so without the flush a native undo mid-edit would undo the *previous* step and let the in-progress edit commit afterwards, duplicating text ([issue #4477](https://github.com/cybersemics/em/issues/4477)). It also dispatches them with `cursorAtEnd`, which makes `undoReducer` / `redoReducer` set `cursorOffset` to the end of the restored thought instead of restoring the offset captured before the undone action — that offset is wherever the cursor was placed when the thought was entered (the tap position, or `0`), which would leave the caret away from the restored word, typically at the beginning of the thought. Only the native path opts in; Cmd+Z and the toolbar keep the word-processor behavior of restoring the cursor to where it was. Placing the caret in the DOM is left to `useEditMode`, which re-runs on the `editableNonce` bump that the undo triggers — the re-render replaces the editable's `innerHTML` and destroys the caret, and the hook sets it again from `cursorOffset`. This is why the hook's `editMode` condition must reflect the *real* keyboard state; see [Edit mode across a momentary blur](cursor-and-caret.md#edit-mode-across-a-momentary-blur).

In the iOS Capacitor app the same gesture arrives by a second route, `nativeHistory`, and never reaches `beforeInput` at all. WebKit dispatches the `historyUndo` / `historyRedo` `beforeinput` only while *its own* undo stack has a step, and it registers a step only for edits it performed itself. em applies most edits by re-rendering the editable from Redux rather than through the browser's editing commands, so WebKit's stack runs dry long before em's history does — from that point iOS handles the gesture itself and reports "Nothing to Undo" while em still has plenty to undo. The gestures are driven by the responder chain's `undoManager`, so `NativeHistoryWebView` (a `WKWebView` subclass supplied by `DevServerViewController`) returns an undo manager that, instead of performing undo and redo, emits the plugin's `nativeHistory` event. `src/device/nativeHistory.ts` subscribes to it from `initEvents` and calls the same `handleNativeHistory`, so both routes behave identically. Because the native manager consumes the gesture, only one route fires per gesture. That manager has no history of its own to answer from, so `nativeHistory` also reports em's `isUndoEnabled` / `isRedoEnabled` back to it through the plugin's `setHistoryAvailability` whenever they change. iOS reads them to decide whether to deliver the gesture at all, and confirms the gestures it does deliver with an "Undo"/"Redo" overlay — so a manager that claims an availability em cannot honor has iOS confirming an undo or redo that does nothing.

### Gesture activation

A gesture is a string of swipe directions, where each character is one of `'l'`, `'r'`, `'u'`, `'d'` (left/right/up/down). For example, `'rdru'` is right → down → right → up. Multiple sequences can map to the same command — the first one is the canonical gesture shown in the UI.

A gesture can only *start* inside the gesture zone ([`isInGestureZone`](../src/util/isInGestureZone.ts), enforced by [`MultiGesture`](../src/components/MultiGesture.tsx)): the screen minus the scroll zone (a strip on the right, or on the left for left-handed users), the toolbar at the top, and — on devices with a home indicator (nonzero `safe-area-inset-bottom`) — a strip at the bottom where the OS recognizes system gestures. Without the bottom exclusion, the upward app switcher swipe is committed as the Open Command Center gesture right before the app suspends. Touches that start outside the zone scroll the page as usual.

`handleGestureSegment` is called incrementally as the user swipes; it triggers a haptic for each new segment and, after `COMMAND_PALETTE_TIMEOUT`, opens the gesture menu so the user can see all commands reachable from the current sequence.

`handleGestureEnd` runs when the gesture finishes. It looks up the final sequence in `commandGestureIndex`, with two special cases:

- **Mobile Command Universe.** If the sequence ends with the `openMobileCommandUniverse` gesture, that command runs.
- **Chained commands.** If the sequence *starts* with a gesture for an `isChainable` command and continues with another command's gesture, the two are chained and executed together. The canonical example: `selectAll` is chainable, so `<selectAll-gesture><archive-gesture>` archives all selected thoughts in one motion. `chainCommand(c1, c2)` synthesizes a `Command` whose gesture and label combine both. Chained gestures are dispatched with `type: 'chainedGesture'` so undo coalesces correctly.

After execution, an alert briefly confirms the command's `label` (in training mode), unless the command has `hideAlert: true`.

### Toolbar and Command Universe

The Toolbar renders a configurable subset of commands as buttons. The user's customization lives at `[EM, Settings, Toolbar]`. Toolbar-relevant fields on a Command:

- **`svg`** — icon component.
- **`isActive(state)`** — returns true if the command should be highlighted (e.g. `pin` is active when the cursor thought is pinned).
- **`isDropdownOpen(state)`** — renders a small dropdown indicator beneath the icon.
- **`overlay.gesture` / `overlay.keyboard`** — alternative shortcuts shown in the toolbar long-press overlay.
- **`longPress(dispatch)`** — runs when a toolbar button is long-pressed.

The **Command Universe** is the searchable command palette. Two flavors:

- **`DesktopCommandUniverse`** (`Cmd/Ctrl + P`) — desktop palette opened by `openCommandCenter` / `openDesktopCommandUniverse`.
- **`MobileCommandUniverse`** — mobile drawer opened by `openMobileCommandUniverse`, also reachable by gesture.

Both filter `globalCommands` by name and respect `hideFromDesktopCommandUniverse` / `hideFromGestureMenu` / `hideFromHelp`. Commands are presented grouped by `COMMAND_GROUPS` (in [`constants.ts`](../src/constants.ts)), which defines the order: Navigation → Creating thoughts → Deleting thoughts → Moving thoughts → Editing thoughts → Oops → Special Views → Visibility → Settings → Help → Cancel.

Both take the browser selection away from the thought as they open — the desktop palette by focusing its search input, the mobile drawer by clearing the selection outright — so both snapshot it into `state.selectionOffsets` on the way in, for the commands whose input is the selected text. See [Caret / Browser Selection](cursor-and-caret.md#caret--browser-selection).

### Multicursor

When `state.multicursors` is non-empty, the user has one or more thoughts selected. A selection of exactly one thought is common — on mobile, opening the Command Center selects the cursor thought. Every command must declare how it behaves in this case via the required `multicursor` field — there is no implicit default.

A selection is started by long pressing a thought ([`useDragHold`](../src/hooks/useDragHold.ts)), by Cmd/Ctrl + Click or Shift + Click ([`Thought`](../src/components/Thought.tsx)), or by the Select All command. Once one is active, a plain click or tap on a thought or on its bullet toggles that thought's selection rather than moving the cursor ([`Editable`](../src/components/Editable.tsx), [`BulletPositioner`](../src/components/BulletPositioner.tsx)) — the same behavior on mobile and desktop. The thought text shows a pointer cursor for as long as the multiselect is active, so that a mouse click over it reads as selecting the thought rather than placing the caret; it reverts to the text cursor while the multiselection is being edited (see [Multi edit mode](cursor-and-caret.md#multi-edit-mode)), where a click does place the caret. The bullet's usual expand/collapse and `=pin` handling is suppressed while a multiselect is active, since expansion is determined by the selected thoughts (see [`expandThoughts`](../src/selectors/expandThoughts.ts)). Deselecting the last selected thought ends the multiselect, which on touch also closes the Command Center ([`multicursorAlertMiddleware`](../src/redux-middleware/multicursorAlertMiddleware.ts)).

- **`multicursor: false`** — execute on `state.cursor` as if no multicursor existed; selection stays. For commands that don't interact with the thoughtspace (e.g. opening modals). The cursor-navigation commands also declare `multicursor: false` yet still respond to a selection, since navigating a multiselect means moving the selection itself rather than executing once per selected thought: [`cursorUp`](../src/commands/cursorUp.ts) and [`cursorDown`](../src/commands/cursorDown.ts) read `state.multicursors` in their own `exec` to extend or collapse the selection, and the [`cursorForward`](../src/actions/cursorForward.ts) and [`cursorBack`](../src/actions/cursorBack.ts) reducers replace the selection with the thoughts one level forward or back.
- **`multicursor: true`** — execute once per selected thought.
- **`multicursor: { ... }`** — fine-grained control with these options:

| Option | Meaning |
|---|---|
| `execMulticursor(cursors, dispatch, getState)` | Custom replacement for the per-cursor loop. |
| `onComplete(filteredCursors, dispatch, getState)` | Callback after the loop finishes. |
| `preventSetCursor` | Don't restore the cursor at the end. |
| `reverse` | Iterate cursors in reverse document order (matters for ops like move). |
| `clearMulticursor` | Clear the multicursor selection after execution. |
| `selectNewCursors` | Select the thoughts the executions moved the cursor to instead of restoring the original selection. |
| `filter` | One of `'all'` (default), `'first-sibling'`, `'last-sibling'`, `'prefer-ancestor'`, applied by [`filterCursors`](../src/selectors/filterCursors.ts). |

`executeCommandWithMulticursor` walks the filtered cursors in document order (`documentSort`), `setCursor`s each path in turn, calls the regular `exec`, and finally restores the original cursor (unless `preventSetCursor` is set) and the multicursors themselves (unless `clearMulticursor` is set). It wraps the loop in `setIsMulticursorExecuting({ value: true, undoLabel: command.id })` so the entire multi-step operation collapses into a single undo entry.

Restoring the multicursors is what keeps the Command Center open on mobile. [`setCursor`](../src/actions/setCursor.ts) clears `state.multicursors` unless `preserveMulticursor` is passed, and [`multicursorAlertMiddleware`](../src/redux-middleware/multicursorAlertMiddleware.ts) closes the Command Center as soon as the selection is empty — so a command that moves the selected thought (`swapParent`, whose reducer ends in `setCursor`) empties the selection mid-run and would dismiss the panel under the user, were the loop not to add the thoughts back at its new path. A command that bypasses the loop, as the `disallow` branch does for a single selected thought, must not move the thought it acts on for this reason.

A command tapped in the Command Center is executed with `type: 'commandCenter'`, and the loop then ends by selecting the thought the cursor landed on whenever nothing is selected any more — which is exactly what a `clearMulticursor` command such as [`delete`](../src/commands/delete.ts) leaves behind. Otherwise the Command Center would dismiss itself the moment such a command was tapped, since [`multicursorAlertMiddleware`](../src/redux-middleware/multicursorAlertMiddleware.ts) closes it as soon as the selection empties; instead it stays open, selecting the cursor thought the same way opening it does, and can be used again straight away. Deleting the last thought leaves no cursor to select, so there the Command Center closes as usual.

`selectNewCursors` is how the thought-creating commands leave the thoughts they created selected, so that a multiselect New Thought is followed by a multiselect of the new thoughts rather than by nothing. It needs no knowledge of where each command inserts, because each of them sets the cursor to the thought it creates: the loop takes the cursor after every `exec` and keeps it when it differs from the path it set, which also means a selected thought the command could not act on — [`newUncle`](../src/commands/newUncle.ts) at the root, [`newGrandChild`](../src/actions/newGrandChild.ts) on a childless thought — contributes nothing. The loop then selects the collected thoughts and sets the cursor to the last of them with `preserveMulticursor`, which recomputes `state.expanded` so that thoughts created away from the original cursor are visible. That same `setCursor` passes `isKeyboardOpen: false`, since the new thoughts are selected rather than edited — there is no typing into several of them at once. Each `exec` opened the keyboard for the thought it created, and a multiselection with the keyboard open is how [`multicursorAlertMiddleware`](../src/redux-middleware/multicursorAlertMiddleware.ts) recognizes a multiselection being edited ([Clear Thought](cursor-and-caret.md#multi-edit-mode)), which it deliberately leaves the Command Center closed over; closing the keyboard is therefore what lets the middleware open the Command Center over the new selection on mobile. Fewer than two of them is not a selection, so it clears instead, ending as the command does without a multiselect: with the caret in the new thought and the keyboard open. [`newSubthought`](../src/commands/newSubthought.ts) and [`newSubthoughtTop`](../src/commands/newSubthoughtTop.ts) reach the same postcondition, including the closed keyboard, through `onComplete` and `execMulticursor` respectively.

`setIsMulticursorExecuting` is the general mechanism for that collapsing, not a private detail of the command loop: [`undoRedoEnhancer`](../src/redux-enhancers/undoRedoEnhancer.ts) merges every action dispatched while `state.isMulticursorExecuting` is true into the preceding undo patch, and shows `undoLabel` in the undo/redo alert. Any code path that edits every selected thought without going through a `multicursor: true` command must bracket its dispatch with the same pair, or the user has to undo once per thought. The [`ColorPicker`](../src/components/ColorPicker.tsx) and [`LetterCasePicker`](../src/components/LetterCasePicker.tsx) reach the thoughtspace through [`formatSelection`](../src/actions/formatSelection.ts) and [`formatLetterCase`](../src/actions/formatLetterCase.ts) rather than through their `multicursor: false` toolbar commands, so those two action-creators do the bracketing themselves; drag-and-drop of a multiselect does the same. Both edit the selected thoughts whether or not the selection has a cursor — a thought stays selectable once the Home button has dismissed the cursor — which is why [`textColor`](../src/commands/textColor.ts) and [`letterCase`](../src/commands/letterCase.ts) admit `hasMulticursor` in `canExecute` and `isActive`.

The flag is also what marks the traversal as bookkeeping rather than user intent, so that observers do not react to the transient state it passes through. Setting the cursor to each selected thought empties `state.multicursors` (the loop does not pass `preserveMulticursor`) and the restore then re-adds them one at a time, so the count falls to zero and climbs back mid-command; it would likewise reset `cursorCleared` on each hop. [`setCursor`](../src/actions/setCursor.ts) preserves `cursorCleared` while the flag is set, and [`multicursorAlertMiddleware`](../src/redux-middleware/multicursorAlertMiddleware.ts) suspends the Command Center's show/hide reaction. Both settle on the closing `setIsMulticursorExecuting({ value: false })`, which the middleware evaluates against the final multicursors.

The whole of `executeCommandWithMulticursor` is synchronous, including that bracket, so an **asynchronous** command gets no help from it: the bracket is opened and closed around the call, and anything dispatched after the first `await` lands outside it. [`generateThought`](../src/commands/generateThought.ts) and [`generateEmoji`](../src/commands/generateEmoji.ts) are the cases in point — their edits may only reach the thoughtspace once a network request has returned. Each defines an `execMulticursor` that yields once (so that the loop's own synchronous bracket has closed), opens a second bracket of its own, generates every selected thought, and closes it only after all of them have settled. A `multicursor: true` declaration would instead leave one undo step per generated thought, and per-cursor caret updates could land on whichever request happened to finish last.

### Gating and defaults

Three fields shape what happens when the command might not be runnable:

- **`canExecute(state)`** — boolean predicate. If false, `exec` is not called. It also drives the enabled appearance of the [Toolbar](../src/components/ToolbarButton.tsx) and [Command Center](../src/components/CommandCenter/PanelCommand.tsx) buttons, so a predicate that reports a command as executable when it would be a no-op leaves an enabled button that does nothing when tapped. A command that acts on the selection must therefore test [`selectedPaths`](../src/selectors/selectedPaths.ts) — the multicursors if there are any, otherwise the cursor — rather than `state.cursor`, which is not the thought the command runs on when a thought elsewhere in the tree is selected. Pass the command's own `multicursor.filter` to `selectedPaths` so that the predicate judges exactly the paths the loop will execute on; otherwise a path that the filter drops (such as a descendant of another selected thought) can disable a command that would have worked. Quantify with `every` when every selected path must be valid, since the multicursor loop aborts the whole selection as soon as one path fails `canExecute`: `indent` and `outdent` require every selected path to be movable, and `swapParent` requires every selected path to be a subthought, so that a selection containing a top-level thought — which has no grandparent to swap with — disables the command outright rather than silently swapping the rest. A command that deliberately supports partial execution can use `some` instead: [`newGrandChild`](../src/commands/newGrandChild.ts) is enabled when any selected thought has a visible child, then its per-path `canExecute` calls skip the childless thoughts during the loop. Because `selectedPaths` prefers the multicursors, the preflight predicate returns the same value for every path in the loop, so the one predicate both dims the button and blocks the gesture; no `disallow` branch is needed, and none should be added, since that branch bypasses the multicursor restore described above.
- **`preventDefault`** — call `e.preventDefault()` even when `canExecute` returns false. Useful for keyboard shortcuts that should *always* swallow the keypress.
- **`permitDefault`** — do *not* call `e.preventDefault()` even when the command runs. Useful for shortcuts that piggyback on existing browser behavior (e.g. system copy/paste).
- **`allowExecuteFromModal`** — allow the command to run while a modal is open. Defaults to false; navigation commands set this to true.

### Repeat

`repeat` (Command/Ctrl + .) has no behavior of its own — its `exec` is a noop. `executeCommand` records the last command it executed in a module-level `lastCommand` variable, and both `executeCommand` and `executeCommandWithMulticursor` resolve `repeat` to it before executing, so the repeated command runs through the normal path with its own `canExecute` and multicursor handling. Resolving before execution (rather than executing from within `repeat.exec`) also keeps `repeat.ts` free of an import of `commands.ts`, which would be circular.

`keyboardIndex` is recorded alongside the command and restored when it is repeated, since it cannot be derived from the Command/Ctrl + . keypress — that keypress matches none of the repeated command's own shortcuts. Without it, repeating `applyColor` would have no swatch to apply and would silently do nothing. `executeCommandWithMulticursor` resolves `repeat` itself and then delegates an already-resolved command, so it forwards the recorded index through executeCommand's `keyboardIndex` option.

Only commands that make an *undoable, non-navigational* change are recorded, so that Repeat repeats the last edit no matter how many navigation or non-undoable commands intervened. This is detected by comparing the last non-navigation undo patch (the patch that Undo would revert, as classified by [`actionMetadata.registry`](../src/util/actionMetadata.registry.ts)) before and after execution. A command with a custom `execMulticursor` never reaches `executeCommand`, so `executeCommandWithMulticursor` records it around that call instead, comparing the patch from the same point the per-cursor loop does — after `setIsMulticursorExecuting`. Consequently:

- Navigation commands (Cursor Down, Jump Back) are skipped — their actions are registered `isNavigation`.
- Commands that dispatch no undoable action (Export, Settings, Command Universe) are skipped, since they add no patch.
- Commands that set `repeatable: false` are never recorded. `undo` and `redo` move through the undo history rather than making a new undoable change, and recording `repeat` would recurse.
- A command that only dispatches asynchronously (Generate Thought) is not recorded, since its patch does not exist yet when `exec` returns.

### Undo history and the undo slider

Every undoable action leaves a patch on `state.undoPatches` ([`undoRedoEnhancer`](../src/redux-enhancers/undoRedoEnhancer.ts)): a fast-json-patch diff that reverts the action, whose operations also carry `actions`, the types of the actions that produced the patch (or, for a multicursor command, its `undoLabel` followed by the types). Nothing else about the actions is recorded; a patch plus the states on either side of it is the complete record of what happened. Undo moves a patch from `undoPatches` to `redoPatches` as a forward patch, and redo moves it back; `redoPatches[0]` is the oldest undone action, i.e. the newest point in the history. The moved patch is recomputed as a diff of the state on either side of the move rather than inverted symbolically, so a patch that a non-undoable action has already reverted — the Note command writes back the `noteFocus` and `noteOffset` that the undoable `setNoteFocus` recorded — applies as a no-op and yields nothing to move. Such a patch is dropped rather than pushed empty: a patch's actions are carried on its operations, so a patch with no operations has no actions, which disables undo and throws the next time it is reached.

An **undo step** — what one Undo reverts — spans two patches when a navigation action follows an undoable action (the cursor is restored to where it was before the edit) or an edit follows a `newThought` (creating a thought and typing its value are one step). [`undoSteps`](../src/selectors/undoSteps.ts) applies the same grouping across both stacks, newest first, and reports the position of the current state. It groups the two stacks separately so that the current state always falls on a step boundary, and it omits one refinement of `undoReducer`: a formatting-only edit of a freshly created thought is undone on its own by Undo but counted with the `newThought` by the selector, since telling them apart requires the thought's value at that point in the history. The `undo` and `redo` actions accept a `count` of patches to revert or restore exactly, bypassing the step logic. That is how the slider moves by whole steps in either direction: the built-in redo grouping is not the mirror image of undo (after undoing an edit together with the cursor move that followed it, one redo restores only the edit), so dispatching a plain `redo()` per step would drift.

The **undo slider** ([`UndoSlider`](../src/components/UndoSlider.tsx), toggled by its toolbar button or by a long press on Undo or Redo) is an rc-slider range over those steps, capped at twenty, with the present at the right. Its two handles start together at the present with the *start* handle on top. Dragging the start handle back reveals the *end* handle, which always stays at least one step after the start (except at the present, where the two coincide); the start handle stops one step before the end handle rather than pushing it. Dragging or tapping either handle moves the thoughtspace to the point in time under it, so after dragging the end handle the user sees the end point while the start handle is preserved, and a tap on the start handle returns to the start point. The name of the action that produced each handle's point in time is rendered under the handle. The handles live in the state of `UndoSlider` rather than of the slider itself, which is unmounted while the slider is closed, so that closing and reopening it leaves them where the user put them. They reset to the current state whenever the total number of patches changes, i.e. when a new action discards the history ahead of the current state and they no longer refer to the same steps. Opening the slider flushes any pending throttled edit through `commandEmitter`, and so does each move: editing dispatches `editThought` on a throttle, and the toolbar does not flush it the way the keyboard and gesture paths do, so an edit typed just before the slider was opened would be missing from the steps and lost as soon as the slider moved the thoughtspace.

The copy button to the right of the slider copies a **bug report** for the actions between the handles ([`stepsToReproduce`](../src/selectors/stepsToReproduce.ts)): under *Steps to Reproduce*, the whole thoughtspace at the start point, exported as plain text with meta attributes inside a markdown code block (omitted when it is empty, which exports as the root's placeholder value rather than as nothing), followed by a numbered step for each undo step up to the end point; under *Current Behavior*, the thoughtspace at the end point; and an empty *Expected Behavior* heading to fill in. The selector reconstructs the state before and after every patch in the range by applying the patches from the current state (inverse patches backwards, forward patches forwards) and describes each step from its action types, its operation paths (which name the thoughts it created, deleted, or edited), and those states. A step names the action as dispatched (``Indent.``, ``Move Thought Down.``, or the command label for a multicursor command) — a creation is named for the command that made it, since New Subthought dispatches `newThought` and only the created thought's parent tells them apart — plus whatever its arguments determined: a typed value (``New Thought `c`.``, or ``New Subthought `e`.`` for a thought created inside the cursor), a new value (``Edit `a` to `aa`.``), the formatting an edit applied (``Bold.``), a pasted text, an attribute path (``Toggle Attribute `=pin`.``), a destination (``Move Thought after `b`.`` (a meta attribute is never used as the landmark, since it is hidden)), or an extracted text. The thought acted on is named only when it is not the cursor (``on the root``), because the steps act on the cursor and the selection: they begin with ``Set the cursor on `b`.`` and, before a multicursor command, ``Select `a` and `b`.``, and a step is preceded by the same whenever it acts on a different cursor or selection than the step before it left. Navigation-only patches are folded into those cursor moves. An action without a hand-written description is named as is, plus any meta attributes it set or removed, which tell toggles apart (``Toggle Sort (sets `=sort/Alphabetical/Desc`).``).

### Adding a new command

1. Create `src/commands/yourCommand.ts`. Default-export a `Command` object with at minimum `id`, `label`, `exec`, and `multicursor`.
2. Add `export { default as yourCommand } from './yourCommand'` to [`src/commands/index.ts`](../src/commands/index.ts).
3. Pick at least one activation surface:
   - `keyboard` — a `Key` object or string. The `index()` startup pass will warn if you collide with an existing shortcut.
   - `gesture` — a string of `l/r/u/d` characters (or array of strings).
   - Toolbar — add an `svg`, `isActive`, and (optionally) `longPress`. Add the `id` to the appropriate group in `COMMAND_GROUPS` ([`constants.ts`](../src/constants.ts)).
4. Decide multicursor behavior. If you skip this and set `multicursor: true`, consider whether `filter` or `execMulticursor` is more appropriate before merging.
5. Add tests under `src/commands/__tests__/`.

A command file is typically self-contained: it imports the action creator(s) and selectors it needs and dispatches them in `exec`. Avoid putting business logic in the command file — keep it in actions/selectors so the command stays a thin wiring layer.

## Reference

The full list of user-facing commands. For the canonical, always-up-to-date set, read [`src/commands/`](../src/commands) directly.

### Back

Move the cursor up a level. If Clear Thought is active, cancel it instead and leave the cursor where it is. When thoughts are selected, deselect them and select the parent of each selected thought instead — except on desktop, where <kbd>Escape</kbd> clears the selection rather than moving it.

<kbd>Escape</kbd>

https://github.com/user-attachments/assets/ab558971-0839-4a46-a421-e074509795f0

### Forward

Move the cursor down a level. When thoughts are selected, deselect them and select the thoughts one level forward instead: the visible children of each selected thought, or its contexts when its context view is active.

### Cursor Up

Move the cursor up.

<kbd>↑</kbd>

### Cursor Down

Move the cursor down.

<kbd>↓</kbd>

### Next Thought

Move the cursor to the next thought, skipping expanded children.

<kbd>Command + ↓</kbd>

https://github.com/user-attachments/assets/d6e73a0c-21e9-4677-94d8-2c98b60c501a

### Previous Thought

Move the cursor to the previous thought.

<kbd>Command + ↑</kbd>

https://github.com/user-attachments/assets/425a64ce-6634-465e-ab5b-c7562fd11c40

### Move Cursor Forward

Move the current thought to the end of the previous thought or to next column in table view.

<kbd>Tab</kbd>

### Move Cursor Backward

Move the current thought to the next sibling of its context or to previous column in table view.

<kbd>Shift + Tab</kbd>

### Jump Back

Move the cursor to the last thought that was edited.

<kbd>Command + j</kbd>

https://github.com/user-attachments/assets/8ed929ad-e8cb-4843-9f8d-3b8581bceeb1

### Jump Forward

Move the cursor to the next edit point. Reverses jump back.

<kbd>Command + Shift + J</kbd>

https://github.com/user-attachments/assets/6c294b5d-0a02-4298-9069-9471cc52667d

### Indent

Indent the current thought one level deeper.

<kbd>Tab</kbd>

https://github.com/user-attachments/assets/85c8e16a-4861-4002-8c49-2b6fc69e284c

### Outdent

Outdent? De-indent? Whatever the opposite of indent is. Move the current thought up a level.

<kbd>Shift + Tab</kbd>

https://github.com/user-attachments/assets/39bf1ddd-d780-4a4c-8256-1ee7dbfb4311

### Swap Parent

Swap the current thought with its parent.

https://github.com/user-attachments/assets/0ca1a77b-e174-4884-9606-739a94cde039

### Swap Grandparent

Swap the current thought with its grandparent, leaving the parent in between where it is. The two thoughts exchange places in the tree and each adopts the other's children.

### Bind Context

Bind two different contexts of a thought so that they always have the same children.

<kbd>Option + Shift + B</kbd>

### Command Universe

Opens the Command Universe, where commands can be executed by name.

<kbd>Command + p</kbd>

https://github.com/user-attachments/assets/5466ad2a-6b7c-4869-a23c-03d9d752dc9b

### Open Command Center

Opens a special keyboard which contains commands that can be executed on the cursor thought. Opening it selects the cursor thought as a multicursor, so every command tapped there runs through `executeCommandWithMulticursor` on a selection of exactly one thought. A `disallow` command is therefore still executable from the Command Center; it only alerts once a second thought is selected.

### Close Command Center

Closes the command center if it's open. You can also just tap on the empty space.

### Gesture Menu

Opens the gesture menu where commands can be executed by gesture.

### Help

Opens the Help screen, which contains the tutorials and a list of all commands.

<kbd>Command + /</kbd>

https://github.com/user-attachments/assets/39430230-e460-4644-82fc-fb4b4c0efcf7

### Home

Navigate to Home.

<kbd>Command + Option + h</kbd>

https://github.com/user-attachments/assets/f9d81d8f-f03e-45d3-850e-55f9f4b56a0d

### Search

Open the Search input. Use the same command to close.

<kbd>Command + Option + f</kbd>

https://github.com/user-attachments/assets/682334ea-823e-497b-818f-584639a5db5b

### New Thought

Create a shiny new thought.

<kbd>Enter</kbd>

https://github.com/user-attachments/assets/a45722e9-efad-421c-80fd-bb71e65398fb

### New Thought (above)

Create a new thought immediately above the current thought.

https://github.com/user-attachments/assets/bbeb1798-468d-49a9-b9de-de5bcf7d52de

### New Subthought

Create a new subthought in the current thought. Adds it to the bottom of any existing subthoughts.

<kbd>Command + Enter</kbd>

https://github.com/user-attachments/assets/616a632b-00a2-430d-a0c1-69977fc6b1a2

### New Subthought (above)

Create a new subthought in the current thought. Add it to the top of any existing subthoughts.

<kbd>Command + Shift + Enter</kbd>

https://github.com/user-attachments/assets/8fbe2754-dcff-4874-803d-149352585986

### New Subthought (next)

Add a new thought one level up. Same as creating a new thought and then outdenting it.

<kbd>Command + Option + Enter</kbd>

https://github.com/user-attachments/assets/e7077d5d-2387-48b5-8a60-c944d38889ec

### New Grandchild

Create a thought within the first subthought.

### Categorize

Move the current thought into a new, empty thought at the same level. With a multiselect, every selected thought moves into the new category — and when every visible sibling is selected, the meta attributes that describe the parent's children — `=view`, `=sort`, and the `=children`, `=grandchildren`, and `=descendants` containers — follow them into the category, each moving whole with everything it holds. The parent's own direct `=pin` stays, since it pins the parent itself rather than the wrapped children.

<kbd>Command + Option + o</kbd> or <kbd>Command + ]</kbd>

https://github.com/user-attachments/assets/4255766e-8c9d-4cdf-a140-573ab82399ae

### Uncategorize

Deletes the current thought and moves all its subthoughts up a level.

<kbd>Command + Option + c</kbd>

https://github.com/user-attachments/assets/a0da2b2a-925e-4f6a-9924-3bba37b7feb2

### Extract Subthought

Extract selected part of a thought as its child.

<kbd>Command + Control + e</kbd>

https://github.com/user-attachments/assets/e415abf1-6c1e-4ffd-b7aa-0fdf372effbc

### Extract Category

Extract selected part of a thought as its new parent. Where Extract Subthought draws the selection down into a child, Extract Category lifts it up into a parent: the rest of the thought — and every other selected thought — is moved into a new category whose value is the extracted text. When the selected thoughts do not share a parent, Categorize refuses and nothing is extracted.

<kbd>Command + Control + Option + e</kbd>

### Generate Thought

Generates a thought using AI.

On first use of the AI generation path on a device, em shows a blocking disclosure modal. The user can cancel, allow the current use only, or allow future uses without seeing the notice again. Choosing either allow option resumes the request that opened the disclosure. A remembered acknowledgement can be removed later under Settings → AI Data Acknowledgment. The command sends the relevant current thought context (ancestors and sibling values around the cursor thought) in a JSON request to the OpenAI-backed AI service at `${VITE_AI_URL}/generateThought`. The indented outline marks context thoughts with `[]` and the replacement target with `[x]`. The service returns a complete replacement for each selected thought, not text to append to its current value. Multiple selected thoughts are generated concurrently and can be reverted together with one undo. `VITE_AI_URL` is the service's base URL so other AI routes can share it. The AI API is rate-limited per IP; when the limit is reached, the command asks the user to try again later. The URL-title branch of this command does not call the AI service.

<kbd>Command + Option + g</kbd>

### Generate Emoji

Generates ten ordered emoji for the current thought using AI and prepends the best match. Repeating the command cycles through the cached alternatives without making another request; editing the thought after generation causes the next use to request fresh alternatives and replace the previously generated prefix. An existing emoji that was not generated by the command is treated as part of the thought and preserved.

Generate Emoji uses the same blocking AI data disclosure, rate limiting, pending state, failure recovery, and `${VITE_AI_URL}` service as Generate Thought, calling `/generateEmoji` with the thought value. Multiple selected thoughts are generated concurrently and can be reverted together with one undo.

Gesture: ↑ → ↓

### Delete

Say goodbye to the current thought. Hit undo if you are not ready to part ways.

<kbd>Command + Option + Shift + Backspace</kbd>

https://github.com/user-attachments/assets/34a928f4-bcac-49bd-b417-bbd1e4a4c1ef

### Archive

Move the thought to a hidden archive. It can be recovered or viewed by toggling hidden thoughts.

<kbd>Command + Shift + Backspace</kbd>

https://github.com/user-attachments/assets/4818bbbd-6df5-44a1-843d-658252ebb822

### Clear Thought

Clear the text of the current thought. A quick recovery after you have changed your mind.

<kbd>Command + Option + Shift + C</kbd>

https://github.com/user-attachments/assets/95f037cc-cf88-4392-98fb-4d79cdae4fba

### Bump Thought Down

Bump the current thought down one level and replace it with a new, empty thought. When multiple thoughts are selected, their parent is bumped down and the selected thoughts are moved into the new thought.

<kbd>Command + Shift + D</kbd>

https://github.com/user-attachments/assets/838c3546-4aa0-4256-af89-621356b455ad

### Move Thought Down

Move the current thought down.

<kbd>Command + Shift + ↓</kbd>

https://github.com/user-attachments/assets/600d6d58-a481-4a8e-91a5-60d8a91c3a19

### Move Thought Up

Move the current thought up.

<kbd>Command + Shift + ↑</kbd>

https://github.com/user-attachments/assets/74dc6532-f7aa-42a3-acaa-9621fbaf4dd8

### Join Thoughts

Join all thoughts at the same level into a single thought.

<kbd>Option + j</kbd>

https://github.com/user-attachments/assets/1f7a91e0-4dd5-4054-b463-9e3b724a8d57

### Merge Duplicates

Merges all duplicate siblings at the same level as the cursor. The first thought of each duplicated value is kept, and the children of the rest are moved into it. Empty thoughts are never treated as duplicates.

### Split Sentences

Splits multiple sentences in a single thought into separate thoughts. Sentence punctuation (`.;!?`) takes priority, and slashes are split into a chain of descendants, e.g. `one/two/three`.

A thought that contains only a single sentence is split into siblings on commas, then on the symbols `↑↓←→+`, then on the word "and". A period that belongs to an abbreviation, a decimal, or a url is not a sentence boundary, so `Mr. Jones → and me` also counts as a single sentence; such a thought splits on its commas and symbols, but not on "and", which commonly joins the parts of one sentence, e.g. `Fruit cost: apple $10.23 and pear $10.70`. A dash or a colon splits it into a main thought and a child instead, e.g. `one - 1` and `Start: 1` both become a thought with a single child. A colon only splits when it is followed by whitespace, so that a time such as `10:30` is left intact. In a comma-separated list, a dash only splits when it is surrounded by whitespace, so that a hyphenated word such as `Jean-Michel` is left intact; the right side of such a dash is then split on its commas, e.g. `Shopping list - apples, bananas` becomes a thought with two children.

<kbd>Command + Shift + S</kbd>

*Note: There is a known bug where the height of the first thought is incorrect after Split Sentences.*

https://github.com/user-attachments/assets/690450bb-30a2-4858-aa44-132a38498ebb

### Select All

Selects all thoughts at the current level. May reduce wrist strain.

<kbd>Command + Option + a</kbd> or <kbd>Command + a</kbd>

### Select Between

Selects all sibling thoughts between two selected endpoints. On desktop, Command/Ctrl-click an unselected thought to
set the fixed anchor, then Shift-click an endpoint. Subsequent Shift-clicks adjust the endpoint, replacing only the
active range while preserving separately selected or previously committed ranges. With no active multiselect,
Shift-click selects the clicked thought and establishes it as the anchor. If the anchor is deselected, the last
remaining selected thought becomes the next anchor.

### Copy Cursor

Copies the cursor and all descendants.

<kbd>Command + c</kbd>

### Delete Empty Thought Or Outdent

<kbd>Backspace</kbd>

### Bold

Bolds the current thought or selected text.

<kbd>Command + b</kbd>

### Italic

Italicizes the current thought or selected text.

<kbd>Command + i</kbd>

### Strikethrough

Formats the current thought or selected text with strikethrough.

<kbd>Command + s</kbd>

### Underline

Underlines the current thought or selected text.

<kbd>Command + u</kbd>

### Code

Formats the current thought or selected text as code.

<kbd>Command + k</kbd>

### Clear Formatting

Clears all formatting from the current thought or selected text.

<kbd>Command + 0</kbd>

### Letter Case

Change the Letter case.

### Text Color

Change the text color or highlight color to your liking.

### Note

Add a small note beneath a thought. Cute!

<kbd>Command + Option + n</kbd>

### Swap Note

<kbd>Option + Shift + N</kbd>

Convert a thought to a note.

https://github.com/user-attachments/assets/60f34371-9fac-4394-a4fd-6f9ccd0f363d

When activated on a thought that already has a note, converts the note to a thought instead.

https://github.com/user-attachments/assets/f25656ff-c347-4543-9da6-f47a46c656ef

### Context View

Opens the context view of the current thought. The context view shows all contexts throughout your thoughtspace in which the thought can be found. Use the same command to close the context view.

<kbd>Option + Shift + S</kbd>

https://github.com/user-attachments/assets/3592bcca-031d-40a0-b463-3424712e59d1

### Prose View

Display subthoughts of the current thought as indented paragraphs.

<kbd>Option + Shift + P</kbd>

### Table View

Display the current list as a table, with subthoughts rendered in the second column.

<kbd>Option + Shift + T</kbd>

https://github.com/user-attachments/assets/accb2319-5926-4fe3-856b-cb4da3c218ab

### Sort

Change the sorting option for the current context. Rotates through manual, alphabetical, and reverse alphabetical.

<kbd>Command + Option + s</kbd>

https://github.com/user-attachments/assets/00a3c72f-2947-478a-a515-db8e5892c434

### Sort Picker

Open a sort picker to pick the sort option and sort by option.

### Normal Text

Sets a heading to normal text.

<kbd>Command + Option + Control + 0</kbd>

### Heading 1

Turns the thought into a large heading.

<kbd>Command + Option + Control + 1</kbd>

### Heading 2

Turns the thought into a medium-large heading.

<kbd>Command + Option + Control + 2</kbd>

### Heading 3

Turns the thought into a medium heading. Perhaps a pattern is emerging?

<kbd>Command + Option + Control + 3</kbd>

### Heading 4

Turns the thought into a medium-small heading. You get the idea.

<kbd>Command + Option + Control + 4</kbd>

### Heading 5

Turns the thought into a small heading. Impressive that you read this far.

<kbd>Command + Option + Control + 5</kbd>

### Pin

Pins open a thought so its subthoughts are always visible.

<kbd>Command + Option + p</kbd>

https://github.com/user-attachments/assets/464834b6-2d7a-453c-afcf-f821b620db55

### Pin All

Pins open all thoughts at the current level.

<kbd>Command + Shift + P</kbd>

https://github.com/user-attachments/assets/db31b678-1e84-48c8-b4bf-0ce70a9b96c7

### Pin Descendants

Pins open all descendants of the current thought. Sets `=descendants/=pin` on the cursor thought, which expands the entire subtree whenever the thought itself is expanded.

<kbd>Command + Option + Shift + P</kbd>

### Mark as done

Crosses out a thought to mark it as completed.

<kbd>Option + Shift + Enter</kbd>

https://github.com/user-attachments/assets/a1fe2f29-29b4-44c8-b687-8e40ae680aad

### Show Hidden Thoughts

Show all hidden thoughts.

<kbd>Option + Shift + H</kbd>

https://github.com/user-attachments/assets/43886846-cc85-4ac2-9f1a-02add856ef24

### Add to Favorites

Add the current thought to your Favorites list.

### Toggle Recently Edited

Open the recently edited sidebar.

<kbd>Option + r</kbd>

### Increase Font Size

Increase the font size. Bigger is better!

### Decrease Font Size

Decrease the font size. Get your reading glasses.

### Undo

Undo the last action.

<kbd>Command + z</kbd>

### Redo

Redo the last undone action.

<kbd>Command + Shift + z</kbd>

### Repeat

Repeats the last command. Repeats the last command.

Navigation and non-undoable commands are ignored, so Repeat always repeats the last command that changed the thoughtspace.

<kbd>Command + .</kbd>

### Toggle Undo Slider

Toggle a handy slider that lets you rewind edits.

Drag the start handle back to rewind, then drag the end handle to a later point; tap a handle to jump to its point in time. The copy button copies a bug report with the steps to reproduce the actions between the two. See [Undo history and the undo slider](#undo-history-and-the-undo-slider).

### Export

Download or copy the current context as plain text or html.

### Customize Toolbar

Add or remove buttons from the toolbar.

### Settings

Customize your experience of em.

### Device Management

Add or remove devices that can access and edit this thoughtspace.

### Cancel

Cancel the current gesture.
