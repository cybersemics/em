# Drag and Drop

**em** uses [react-dnd](https://github.com/react-dnd/react-dnd) for drag-and-drop, plus a thin layer of Redux state and React hooks that coordinate long press, multicursor selection, drop-zone disambiguation, hover feedback, and a quick-delete gutter. The drag-and-drop subsystem touches almost every visible thought: every `Thought` is both a drag source and a drop target, plus there are several specialized drop targets for end-of-list, child-of, cliff, and uncle insertion.

This doc covers the architecture (backend selection, state machine, zones), the hooks and components, multicursor drag, and the patches we apply to the touch and HTML5 backends.

## Architecture overview

### Backend selection

[`DragAndDropContext`](../src/components/DragAndDropContext.tsx) wraps the app in `DndProvider` and selects the backend by `isTouch`:

| Platform | Backend | Library |
|---|---|---|
| Touch (mobile, tablet) | `TouchBackend` | [`react-dnd-touch-backend`](https://github.com/react-dnd/react-dnd) |
| Desktop | `HTML5Backend` | [`react-dnd-html5-backend`](https://github.com/react-dnd/react-dnd) |

Both backends are configured with:

- `delayTouchStart: TIMEOUT_LONG_PRESS_THOUGHT` (400 ms) — how long a touch must be held before a drag begins.
- `touchSlop: TOUCH_SLOP` (10 px) — how far a touch can move before it's interpreted as a scroll instead of a drag.
- `preview: true` — render a drag preview.

The values come from [`constants.ts`](../src/constants.ts).

### State machine: `state.longPress`

The whole subsystem is orchestrated by a single Redux state field, [`state.longPress`](../src/@types/State.ts), which is a `LongPressState` enum with these values (see [`constants.ts`](../src/constants.ts)):

- `Inactive` — no press in progress.
- `DragHold` — the user has held a thought past the long-press threshold without moving more than `TOUCH_SLOP` px. Bullet is highlighted; an alert is shown.
- `DragInProgress` — react-dnd has emitted `beginDrag` and the drag is live.
- `DragCanceled` — the drag has been aborted (e.g. user shake gesture). Hover handlers ignore further movement.

Transitions happen in:

- [`useDragHold`](../src/hooks/useDragHold.ts) → `Inactive` → `DragHold` on long-press start, back to `Inactive` on long-press end.
- The `beginDrag` handler in each drag source → `DragHold` → `DragInProgress`.
- The `endDrag` / drop / abort handlers → back to `Inactive`.

Three companion fields ride alongside it:

- `state.draggingThoughts: SimplePath[]` — the paths currently being dragged. Populated by `beginDrag`. Multi-element when multicursor is active (see [Multicursor drag](#multicursor-drag)).
- `state.hoveringPath: Path | null` — the most recent drop-target path being hovered.
- `state.hoverZone: DropThoughtZone` — `ThoughtDrop` (insert before this thought) or `SubthoughtsDrop` (drop as a child).

These are what `DropHover` and other UI components subscribe to.

### Drag sources

There are four drag sources in the app, each implemented as a hook:

| Source | Hook | Drag item |
|---|---|---|
| Thought row | [`useDragAndDropThought`](../src/hooks/useDragAndDropThought.tsx) | `DragThoughtItem[]` (one entry per thought, supports multicursor) |
| Toolbar button | [`useDragAndDropToolbarButton`](../src/hooks/useDragAndDropToolbarButton.ts) | `{ command, zone: 'Toolbar' }` |
| Favorite | [`useDragDropFavorites`](../src/hooks/useDragDropFavorites.ts) | `[{ path, simplePath, zone: 'Favorites' }]` |
| File from OS | (handled by react-dnd-html5-backend's `NativeTypes.FILE`) | the dropped files |

All thought-source drags carry the array shape, so a single drag and a multicursor drag use the same drop logic with different array sizes.

### Drop zones

[`DropThoughtZone`](../src/@types/DropThoughtZone.ts) distinguishes the two main thought-drop semantics:

- **`ThoughtDrop`** — drop *before* the target thought (i.e. insert as the previous sibling).
- **`SubthoughtsDrop`** — drop *as a child* of the target thought.

The drop targets in the UI are:

- **Each Thought row** — a `ThoughtDrop` zone, wired by `useDragAndDropThought`.
- [`DropChild`](../src/components/DropChild.tsx) — a `SubthoughtsDrop` zone rendered inside a thought when it's empty or collapsed.
- [`DropEnd`](../src/components/DropEnd.tsx) — a `SubthoughtsDrop` zone at the end of a subthought list.
- [`DropCliff`](../src/components/DropCliff.tsx) — renders one `DropEnd` per cliff level when depth decreases by more than 1, so a thought can be dropped at any of the intermediate levels exposed by the cliff.
- [`DropUncle`](../src/components/DropUncle.tsx) — a `ThoughtDrop` zone for inserting before the next hidden uncle, when the immediate parent is hidden by autofocus.
- [`Favorites`](../src/components/Favorites.tsx) — its own zone, handled by `useDragDropFavorites`.
- [`DropGutter`](../src/components/DropGutter.tsx) — the right-edge invisible quick-delete panel; see [Quick drops](#quick-drops).

## Hooks

### `useDragAndDropThought`

Used by the [`Thought`](../src/components/Thought.tsx) component. Wires up *both* a drag source and a drop target on every visible thought. Two `useDrag` hooks (`dragSourceBullet`, `dragSourceEditable`) are returned because the bullet and the editable text need separately-stable refs.

Notable behavior in [`useDragAndDropThought.tsx`](../src/hooks/useDragAndDropThought.tsx):

- **`canDrag`** rejects drags from immovable / readonly thoughts (checked via `=immovable` / `=readonly` attributes on the thought *or its parent*) and from non-editable documents.
- **`canDrop`** rejects the drop if `state.longPress !== DragInProgress` (so it short-circuits when the drag has been canceled), if the parent path has the context view active (you can't drop into a context view), or if the destination is a descendant of any dragged thought (use of [`canDropPath`](../src/hooks/useDragAndDropThought.tsx), a [moize](https://github.com/planttheidea/moize)-cached helper with `maxSize: 50`, since `canDrop` runs every frame during hover).
- **`drop`** validates each item separately (root/EM contexts can't move out of their root; can't drop on self), animates the dragged thought's flight to a collapsed destination via [`animateDroppedThought`](../src/util/animateDroppedThought.ts), and then dispatches either `moveThought` (default) or `createThought` (when in the context view, dropping creates a new entry under the dragged context). Wraps multicursor drops in `setIsMulticursorExecuting` so undo coalesces them.
- **`hover`** is throttled by mouse position via [`throttleByMousePosition`](../src/util/throttleByMousePosition.ts) to update `state.hoveringPath` and `state.hoverZone` only when the cursor actually moves.

### `useDragAndDropSubThought`

Used by `DropChild` and `DropEnd`. Drop-only — there is no drag source. See [`useDragAndDropSubThought.ts`](../src/hooks/useDragAndDropSubThought.ts).

Distinguishing rules from `useDragAndDropThought`:

- `canDrop` accounts for autofocus visibility: a thought hidden by autofocus is *not* droppable, except when it's the closest hidden parent of the cursor (which gets a dedicated drop zone). Uses [`visibleDistanceAboveCursor`](../src/selectors/visibleDistanceAboveCursor.ts) to compute distance.
- The `drop` handler honors the `=drop` attribute on the parent: if `=drop/top`, the dropped thought is inserted as the *first* child instead of the last (see [Metaprogramming](metaprogramming.md)).
- Calls [`useDragLeave`](../src/hooks/useDragLeave.ts) to debounce the clear of `state.hoveringPath` (so brief flickers between adjacent drop zones don't blank the UI).

### `useDragAndDropToolbarButton`

Used by toolbar buttons in the Customize Toolbar modal. Drag source + drop target in one. The drag item carries a `Command` object plus `zone: 'Toolbar'`. The drop logic dispatches `initUserToolbar` to materialize `[EM, Settings, Toolbar]` if it doesn't exist, then either inserts the dragged command (`newThought`) or moves it (`moveThought`) to its new rank. See [`useDragAndDropToolbarButton.ts`](../src/hooks/useDragAndDropToolbarButton.ts).

### `useDragDropFavorites`

Used inside [`Favorites`](../src/components/Favorites.tsx). Each entry is both a drag source and a drop target. Drops within Favorites reorder via the `=favorite` Lexeme's contexts list (mutated in-place via `updateThoughts`). See [`useDragDropFavorites.ts`](../src/hooks/useDragDropFavorites.ts).

Drops *from* Favorites *to* the main thoughts area are handled by the regular thought drop targets, since the dragged item carries `zone: 'Favorites'` which propagates through.

### `useDragHold` and `useLongPress`

The long-press → drag coupling is subtle because both react-dnd-touch-backend and the app want to track when the user has held long enough.

[`useDragHold`](../src/hooks/useDragHold.ts) is the "make the bullet glow" / "show the alert" hook. It just wraps [`useLongPress`](../src/hooks/useLongPress.ts) and dispatches `longPress({ value: DragHold })` on start, `longPress({ value: Inactive })` on end.

[`useLongPress`](../src/hooks/useLongPress.ts) does the actual timing, but **on touch devices it does not run its own timer** — it listens for the custom `dragStart` event emitted by our patched touch backend (see [Patches](#react-dnd-patches)). This was an explicit design decision: when there were two competing timers (the backend's `delayTouchStart` and `useLongPress`'s own `setTimeout`), they could fall out of sync and produce buggy behavior. Now there is exactly one timer (the backend's), and `useLongPress` is downstream of it.

On desktop, `useLongPress` runs its own `setTimeout(delay)` because the HTML5 backend doesn't have a long-press concept.

`useLongPress` also calls [`allowTouchToScroll(false)`](../src/device/allowTouchToScroll.ts) on long-press start to prevent iOS Safari from initiating a scroll before drag-and-drop kicks in (see [issue #3141](https://github.com/cybersemics/em/issues/3141)).

### `useDragLeave`

[`useDragLeave`](../src/hooks/useDragLeave.ts) tracks how many drop targets are currently being deep-hovered (a module-level `hoverCount`). When the count drops to zero, it debounces a 50 ms clear of `state.hoveringPath`. This prevents flicker when the cursor briefly leaves one drop zone before entering an adjacent one.

### `useDropHoverColor`

[`useDropHoverColor`](../src/hooks/useDropHoverColor.ts) — small UI hook that maps the drop zone's depth to its hover color. Used by the various Drop* components.

## Components

### Thought (built-in drop target)

The `Thought` component itself is the primary `ThoughtDrop` zone. There's no dedicated "DropThought" component — the drop target wires itself onto the Thought row via `useDragAndDropThought`.

### `DropChild`

[`DropChild`](../src/components/DropChild.tsx) — drop-as-subthought target rendered inside a thought when it's empty or collapsed. Won't render for the dragged thought itself. Wrapped in [`DragOnly`](../src/components/DragOnly.tsx) so it's only present in the DOM during a drag.

### `DropEnd`

[`DropEnd`](../src/components/DropEnd.tsx) — drop-as-final-subthought target. Renders at the end of every Subthoughts list. Calculates extra height when at a cliff via [`calculateCliffDropTargetHeight`](../src/util/calculateCliffDropTargetHeight.ts), so the click target stays generous when there are no thoughts below.

`DropEnd` has special handling for sorted contexts: when the parent is `=sort/Alphabetical`, the drop hover only renders if the dragged thought would actually be sorted to the end of the list — otherwise the insertion point is shown via `DropHover` between siblings instead.

### `DropCliff`

[`DropCliff`](../src/components/DropCliff.tsx) — when the visible depth decreases by more than 1 (a "cliff" — e.g. moving from the deepest descendant of one branch back up two levels to the next sibling), a single `DropEnd` isn't enough; the user could mean to drop at any of the intermediate levels. `DropCliff` renders one `DropEnd` per cliff level, positioned by the path's depth.

### `DropUncle`

[`DropUncle`](../src/components/DropUncle.tsx) — when autofocus has hidden the immediate parent of a thought, the next visible thought may be a hidden uncle. `DropUncle` renders the drop target that lets the user drop *before* that uncle, effectively inserting after the hidden parent.

### Favorites

[`Favorites`](../src/components/Favorites.tsx) — the favorites panel; uses `useDragDropFavorites` for drag and drop within the panel.

### Quick drops

[`DropGutter`](../src/components/DropGutter.tsx) — an invisible 2em-wide panel pinned to the right edge of the screen, mounted only while a drag is in progress (the file's default export is `QuickDropController`, which subscribes to `state.longPress === DragInProgress` and conditionally mounts `DropGutter`).

When a thought is dropped on the gutter:

- If dragged from the main thoughts area (`zone: Thoughts`), the thought is archived via [`archiveThought`](../src/actions/archiveThought.ts) with a haptic vibration of `DELETE_VIBRATE_DURATION` (80 ms).
- If dragged from favorites (`zone: Favorites`), the `=favorite` attribute is toggled off via `toggleAttribute`.

When the user hovers the gutter without dropping, a contextual alert is shown (e.g. *"Drop to delete cat"*).

The previous `QuickDropIcon` / `DeleteDrop` / `CopyOneDrop` / `ExportDrop` icon stack has been removed; only the delete gutter remains.

### Helpers

- [`DragAndDropContext`](../src/components/DragAndDropContext.tsx) — `DndProvider` wrapping the app; selects backend by `isTouch`.
- [`DragOnly`](../src/components/DragOnly.tsx) — a fragment that only renders its children when `state.longPress === DragInProgress` (or a test flag is set). Used to skip mounting drop targets and overlays when not dragging.
- [`DropHover`](../src/components/DropHover.tsx) — the blue-bar visual indicator. Subscribes to `state.hoveringPath` and `state.hoverZone` and decides whether *this* particular drop target should render the bar. For sorted contexts, additionally compares the dragging value's `compareReasonable` order against neighbors to choose which gap to highlight.

## Multicursor drag

When a user has multiple thoughts selected via the multicursor (`state.multicursors`), dragging *any* selected thought drags the entire selection. `useDragAndDropThought.beginDrag` does the assembly:

1. If a multicursor is active and the dragged thought is *not* part of it, add it via `addMulticursor`.
2. Build the drag item array: every multicursor path plus the dragged thought.
3. Sort the array by document order with [`documentSort`](../src/selectors/documentSort.ts) so drops apply in the correct order.
4. Set `state.draggingThoughts` to the simple paths and dispatch `longPress({ value: DragInProgress })`.

The drop handler iterates the array and dispatches `moveThought` per item. To make undo coalesce the whole multi-move into one entry, it wraps the dispatch in `setIsMulticursorExecuting({ value: true, undoLabel: 'Dragging Thoughts' })` and clears it after.

## Performance considerations

Drag-and-drop runs hot — `canDrop` and `hover` fire many times per second during a drag. The codebase uses several techniques to keep this cheap:

- **`DragOnly`** wraps every component that exists only to show drop targets / hover bars during a drag, so they don't mount when no drag is in progress.
- **`canDropPath`** in `useDragAndDropThought` is `moize`-memoized with `maxSize: 50` because the same `(from, to)` pair gets re-checked on every animation frame.
- **`throttleByMousePosition`** wraps the hover handlers so dispatches only happen when the mouse actually moves, not on every event.
- **`useDragLeave`** debounces the clear of `state.hoveringPath` by 50 ms via a module-level `hoverCount` so brief gaps between drop zones don't blank the UI.

## react-dnd patches

Four patches live under [`.yarn/patches/`](../.yarn/patches), three for the touch backend and one for the HTML5 backend. Patches stack: each patch is applied on top of the previous one's output. To create a new touch-backend patch, you must specify the correct candidate package (because there are already two layered patches):

```
$ yarn patch -u react-dnd-touch-backend
Usage Error: Multiple candidate packages found; explicitly choose one of them
```

`yarn patch` lists the candidates. Take the *last* one (the most-layered one) and pass it back in single quotes:

```
yarn patch -u 'react-dnd-touch-backend@patch:react-dnd-touch-backend@patch%3Areact-dnd-touch-backend@npm%253A16.0.1...'
```

### `react-dnd-touch-backend-npm-16.0.1-2b96ba84be.patch`

Combines two earlier efforts into one base patch:

1. Backports [react-dnd PR #3664](https://github.com/react-dnd/react-dnd/pull/3664) — fixes a bug where two taps in quick succession were collapsed into one.
2. From [em PR #3119](https://github.com/cybersemics/em/pull/3119) — restructures the touch-backend timing to remove a race condition between its internal long-press timer and a competing timer that used to live in `useLongPress`.

The substantive changes:

1. [Don't cancel a pending drag](../.yarn/patches/react-dnd-touch-backend-npm-16.0.1-2b96ba84be.patch) when `touchmove` deltas are within `this.options.touchSlop`. Logic was lifted up from later in the same function and copied from sibling functions that already respected `touchSlop`.
2. Reset `_mouseClientOffset` when a touch ends, regardless of whether drag-and-drop had started. (Previously only reset after a successful drag, which threw off the next drag's distance calculation.)
3. Emit a custom `dragStart` event on the root element when the long-press timer fires. This is what `useLongPress` listens for on touch — it lets us delete the competing timer in `useLongPress` entirely.

### `react-dnd-touch-backend-patch-0040823149.patch`

From [em PR #3138](https://github.com/cybersemics/em/pull/3138) — fixes another tap-collapse edge case: a missing `clearTimeout` was causing multiple quick taps to be interpreted as a single tap.

### `react-dnd-touch-backend-patch-2c3a2052b6.patch`

The third (most recent) layered touch-backend patch. It adds **scroll-to-cancel**: if a `scroll` event fires before the drag has started, cancel the pending drag; if scroll fires *during* a drag, end the drag. Specifically:

- Adds a `handleScroll` arrow-method to `TouchBackendImpl` that clears the pending-drag timer (or calls `endDrag` if a drag is already live), then unbinds itself.
- Registers `handleScroll` on `window` from `handleTopMoveStartDelay` (the backend's "you started touching, here comes the long-press timer" handler) so the scroll listener is only active during the relevant window.
- Sets a `scrollHasBegun` flag on touchmove if the timer is still pending.
- Cleans up `this.timeout = 0` after the timer fires and at touchSlop, so the scroll handler can distinguish "drag pending" from "drag started".

This addresses the iOS Safari edge case where a vertical scroll begins before `touchSlop` is exceeded — once Safari starts scrolling, it can't be cancelled programmatically, so the drag has to bow out.

### `react-dnd-html5-backend-npm-16.0.1-754940d855.patch`

Single change to the HTML5 backend: removes a `e.preventDefault()` call inside the native-item drop handler. Removing it lets native drag sources (e.g. external file drops) proceed without their default behavior being suppressed at the wrong moment.
