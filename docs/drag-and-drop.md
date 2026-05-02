# Drag and Drop

em uses the [react-dnd](https://github.com/react-dnd/react-dnd) library for drag-and-drop functionality.

There are a variety of components and hooks that utilize drag-and-drop.

## Toolbar

[useDragAndDropToolbarButton](../src/hooks/useDragAndDropToolbarButton.ts) - Hook that defines `canDrag`, `beginDrag`, `endDrag`, `canDrop` and `drop` for dragging or dropping a toolbar button when customizing the toolbar.

## Thoughts

[useDragAndDropThought](../src/hooks/useDragAndDropThought.tsx) - Hook that defines `canDrag`, `beginDrag`, `endDrag`, `canDrop` and `drop` for dragging or dropping a thought. Used by the `Thought` component so that every thought can be dragged, and every thought can serve as a drop target (inserted before, i.e. as the previous sibling).

[useDragAndDropSubThought](../src/hooks/useDragAndDropSubThought.ts) - Hook that defines `canDrop` and `drop` for dropping a thought as a subthought (i.e. child). Used by `DropChild` and `DropEnd` since they both involve dropping a thought as a subthought.

[useDragDropFavorites](../src/hooks/useDragDropFavorites.ts) - Hook that defines `canDrag`, `beginDrag`, `endDrag`, `canDrop` and `drop` for dragging or dropping a thought within the favorites panel. Consumed by [Favorites](../src/components/Favorites.tsx).

[DropChild](../src/components/DropChild.tsx) - Allows a thought to be dropped as a subthought of a thought that is empty or collapsed.

[DropEnd](../src/components/DropEnd.tsx) - Allows a thought to be dropped at the end of a list of subthoughts.

[DropCliff](../src/components/DropCliff.tsx) - Renders one `DropEnd` per cliff level when the visible depth decreases by more than 1, so a thought can be dropped at any of the intermediate parent levels.

[DropUncle](../src/components/DropUncle.tsx) - Allows a thought to be dropped before the next hidden uncle. For example, if a thought `c` is dragged onto a `DropUncle` drop target, it will be dropped before the next hidden uncle `e` (after the hidden parent `a`).

## Quick drops

[DropGutter](../src/components/DropGutter.tsx) - An invisible panel that slides in along the right edge of the screen while a drag is in progress. Dropping a thought onto it deletes the thought (or removes it from favorites when dragged from the favorites zone). The file's default export, `QuickDropController`, mounts the gutter only while a drag is active.

The previous `QuickDropIcon` / `DeleteDrop` / `CopyOneDrop` / `ExportDrop` icon stack has been removed; only the delete gutter remains.

## Drag-and-drop helper components

[DragAndDropContext](../src/components/DragAndDropContext.tsx) - Provides drag-and-drop context to the entire component hierarchy.

[DragOnly](../src/components/DragOnly.tsx) - A container fragment that only renders its children when `state.dragInProgress` is true. Strictly performance related. Useful for short circuiting child components with expensive selectors.

[DropHover](../src/components/DropHover.tsx) - Renders a blue bar at the insertion point when a valid drop target is being hovered over.

## react-dnd patches

We have patched `react-dnd-touch-backend` multiple times already, and in order to create a new patch, you must specify the correct candidate package.

```
$ yarn patch -u react-dnd-touch-backend
Usage Error: Multiple candidate packages found; explicitly choose one of them (use `yarn why <package>` to get more information as to who depends on them):

- react-dnd-touch-backend@patch:react-dnd-touch-backend@npm%3A16.0.1#~/.yarn/patches/react-dnd-touch-backend-npm-16.0.1-2b96ba84be.patch::version=16.0.1&hash=77964d
- react-dnd-touch-backend@patch:react-dnd-touch-backend@patch%3Areact-dnd-touch-backend@npm%253A16.0.1%23~/.yarn/patches/react-dnd-touch-backend-npm-16.0.1-2b96ba84be.patch%3A%3Aversion=16.0.1&hash=77964d#~/.yarn/patches/react-dnd-touch-backend-patch-0040823149.patch::version=16.0.1&hash=33fdd5
```

Specifying the candidate package involves copying the name of the last one in the list, and then pasting it in single quotes:

```
yarn patch -u 'react-dnd-touch-backend@patch:react-dnd-touch-backend@patch%3Areact-dnd-touch-backend@npm%253A16.0.1%23~/.yarn/patches/react-dnd-touch-backend-npm-16.0.1-2b96ba84be.patch%3A%3Aversion=16.0.1&hash=77964d#~/.yarn/patches/react-dnd-touch-backend-patch-0040823149.patch::version=16.0.1&hash=33fdd5'
```

A description of the existing patches follows:

### react-dnd-touch-backend-npm-16.0.1-2b96ba84be.patch

This first patch is the result of two separate efforts that were undertaken at different times but were combined into a single patch.

The first patch is the result of https://github.com/react-dnd/react-dnd/pull/3664 and provided a fix for an issue where tapping twice in quick succession would be seen as a single tap by `react-dnd-touch-backend`.

Next came https://github.com/cybersemics/em/pull/3119, which made more extensive changes in order to prevent race conditions between the timer running in `react-dnd-touch-backend` that controlled drag-and-drop behavior, and a separate timer running in `useLongPress` that controlled long press behavior.

To summarize, in chronological order rather than in the order that the changes appear in the source file:

1. [Don't cancel a pending drag](../.yarn/patches/react-dnd-touch-backend-npm-16.0.1-2b96ba84be.patch) if `touchmove` events are less than the distance defined in `this.options.touchSlop`. Logic was moved up from later in the function and copied from other functions where `touchSlop` was already being respected.

2. Reset `_mouseClientOffset` when a touch ends. This was previously only happening if drag-and-drop had begun, which was throwing off the distance calculation above.

3. Emit a custom `dragStart` event that can be consumed by event handlers. This change allows us to remove the competing timer in `useLongPress`, which could never be properly synced with the timer in `TouchBackendImpl`.

### react-dnd-touch-backend-patch-0040823149.patch

This patch is a result of https://github.com/cybersemics/em/pull/3138 and patches another edge case where `clearTimeout` is not called and multiple quick taps are interpreted as a single tap.

### react-dnd-touch-backend-patch-2c3a2052b6.patch

A subsequent patch layered on top of the two above; see [.yarn/patches/react-dnd-touch-backend-patch-2c3a2052b6.patch](../.yarn/patches/react-dnd-touch-backend-patch-2c3a2052b6.patch) for the diff.
