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
const pinCommand: Command = {
  id: 'pin',
  label: 'Pin',
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
    /* dispatch toggleAttribute({ path: cursor, values: ['=pin', 'true'] }) */
  },
  isActive: state => !!isPinned(state, head(/* ... */)),
}
```

`exec` receives the Redux `dispatch`, a `getState` thunk, the event that triggered the command, and a `{ type }` field that is `'keyboard'`, `'gesture'`, `'toolbar'`, or `'chainedGesture'` so the command can adapt its behavior (e.g. `pin` shows an alert only when triggered via keyboard, since the toolbar already gives visual feedback).

### Discovery and indexing

At startup, [`commands.ts`](../src/commands.ts) flattens the barrel into `globalCommands: Command[]` and builds three indices via `index()`:

- **`commandKeyIndex`** — `hash(keyboard) → Command`. Used by `keyDown` for O(1) shortcut lookup.
- **`commandIdIndex`** — `id → Command`. Used by `commandById(id)`. Use this only when the id is dynamic; otherwise prefer a static import.
- **`commandGestureIndex`** — `gestureSequence → Command`. Used by `handleGestureEnd` for O(1) gesture lookup.

If two commands share the same keyboard hash, `index()` logs a `console.error` at startup naming both — so collisions surface early.

### Keyboard activation

The global `keyDown` handler (registered by [`initEvents.ts`](../src/util/initEvents.ts)) hashes the event with `hashKeyDown(e)`:

```
(meta|ctrl ? 'META_' : '') + (alt ? 'ALT_' : '') + (shift ? 'SHIFT_' : '') + key.toUpperCase()
```

Hashes are uppercased, modifier-prefixed strings — so `Cmd+Shift+P` becomes `META_SHIFT_P`. `commandKeyIndex[hash]` resolves the command in O(1). The handler also:

- Skips entirely if `state.showDesktopCommandUniverse` is open.
- Skips when a modal is showing, *unless* the command has `allowExecuteFromModal: true` (e.g. navigation commands that should still work).
- Calls `e.preventDefault()` before dispatching, *unless* `command.permitDefault` is set. (`command.preventDefault` forces a preventDefault even when `canExecute` returns false.)
- Routes through `executeCommandWithMulticursor`, which short-circuits to `executeCommand` if no multicursor is active.

There's a special case in `beforeInput` for `newThought` and `indent` to handle iOS auto-capitalization: the Enter / space character is prevented in the `beforeinput` event rather than `keydown` ([issue #3707](https://github.com/cybersemics/em/issues/3707)).

### Gesture activation

A gesture is a string of swipe directions, where each character is one of `'l'`, `'r'`, `'u'`, `'d'` (left/right/up/down). For example, `'rdru'` is right → down → right → up. Multiple sequences can map to the same command — the first one is the canonical gesture shown in the UI.

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

### Multicursor

When `state.multicursors` is non-empty, the user has multiple thoughts selected. Every command must declare how it behaves in this case via the required `multicursor` field — there is no implicit default.

- **`multicursor: false`** — execute on `state.cursor` as if no multicursor existed; selection stays. For commands that don't interact with the thoughtspace (e.g. opening modals).
- **`multicursor: true`** — execute once per selected thought.
- **`multicursor: { ... }`** — fine-grained control with these options:

| Option | Meaning |
|---|---|
| `disallow` | Block execution and show an alert. Use sparingly — usually `multicursor: false` or `filter` is better. |
| `error` | The alert message shown when `disallow` is true. String or `(state) => string`. |
| `execMulticursor(cursors, dispatch, getState)` | Custom replacement for the per-cursor loop. |
| `onComplete(filteredCursors, dispatch, getState)` | Callback after the loop finishes. |
| `preventSetCursor` | Don't restore the cursor at the end. |
| `reverse` | Iterate cursors in reverse document order (matters for ops like move). |
| `clearMulticursor` | Clear the multicursor selection after execution. |
| `filter` | One of `'all'` (default), `'first-sibling'`, `'last-sibling'`, `'prefer-ancestor'`. |

`executeCommandWithMulticursor` walks the filtered cursors in document order (`documentSort`), `setCursor`s each path in turn, calls the regular `exec`, and finally restores the original cursor (unless `preventSetCursor` is set). It wraps the loop in `setIsMulticursorExecuting({ value: true, undoLabel: command.id })` so the entire multi-step operation collapses into a single undo entry.

### Gating and defaults

Three fields shape what happens when the command might not be runnable:

- **`canExecute(state)`** — boolean predicate. If false, `exec` is not called.
- **`preventDefault`** — call `e.preventDefault()` even when `canExecute` returns false. Useful for keyboard shortcuts that should *always* swallow the keypress.
- **`permitDefault`** — do *not* call `e.preventDefault()` even when the command runs. Useful for shortcuts that piggyback on existing browser behavior (e.g. system copy/paste).
- **`allowExecuteFromModal`** — allow the command to run while a modal is open. Defaults to false; navigation commands set this to true.

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

Move the cursor up a level.

<kbd>Escape</kbd>

https://github.com/user-attachments/assets/ab558971-0839-4a46-a421-e074509795f0

### Forward

Move the cursor down a level.

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

### Bind Context

Bind two different contexts of a thought so that they always have the same children.

<kbd>Option + Shift + B</kbd>

### Command Universe

Opens the Command Universe, where commands can be executed by name.

<kbd>Command + p</kbd>

https://github.com/user-attachments/assets/5466ad2a-6b7c-4869-a23c-03d9d752dc9b

### Open Command Center

Opens a special keyboard which contains commands that can be executed on the cursor thought.

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

Move the current thought into a new, empty thought at the same level.

<kbd>Command + Option + o</kbd> or <kbd>Command + ]</kbd>

https://github.com/user-attachments/assets/4255766e-8c9d-4cdf-a140-573ab82399ae

### Uncategorize

Deletes the current thought and moves all its subthoughts up a level.

<kbd>Command + Option + c</kbd>

https://github.com/user-attachments/assets/a0da2b2a-925e-4f6a-9924-3bba37b7feb2

### Extract

Extract selected part of a thought as its child.

<kbd>Command + Control + e</kbd>

https://github.com/user-attachments/assets/e415abf1-6c1e-4ffd-b7aa-0fdf372effbc

### Generate Thought

Generates a thought using AI.

<kbd>Command + Option + g</kbd>

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

Bump the current thought down one level and replace it with a new, empty thought.

<kbd>Command + Option + d</kbd>

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

### Split Sentences

Splits multiple sentences in a single thought into separate thoughts.

<kbd>Command + Shift + S</kbd>

*Note: There is a known bug where the height of the first thought is incorrect after Split Sentences.*

https://github.com/user-attachments/assets/690450bb-30a2-4858-aa44-132a38498ebb

### Select All

Selects all thoughts at the current level. May reduce wrist strain.

<kbd>Command + Option + a</kbd> or <kbd>Command + a</kbd>

### Select Between

Selects all thoughts between two selected thoughts.

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

<kbd>Command + Option + 0</kbd>

### Heading 1

Turns the thought into a large heading.

<kbd>Command + Option + 1</kbd>

### Heading 2

Turns the thought into a medium-large heading.

<kbd>Command + Option + 2</kbd>

### Heading 3

Turns the thought into a medium heading. Perhaps a pattern is emerging?

<kbd>Command + Option + 3</kbd>

### Heading 4

Turns the thought into a medium-small heading. You get the idea.

<kbd>Command + Option + 4</kbd>

### Heading 5

Turns the thought into a small heading. Impressive that you read this far.

<kbd>Command + Option + 5</kbd>

### Pin

Pins open a thought so its subthoughts are always visible.

<kbd>Command + Option + p</kbd>

https://github.com/user-attachments/assets/464834b6-2d7a-453c-afcf-f821b620db55

### Pin All

Pins open all thoughts at the current level.

<kbd>Command + Shift + P</kbd>

https://github.com/user-attachments/assets/db31b678-1e84-48c8-b4bf-0ce70a9b96c7

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

### Toggle Undo Slider

Toggle a handy slider that lets you rewind edits.

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
