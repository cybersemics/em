# Drag and Drop

em uses the [react-dnd](https://github.com/react-dnd/react-dnd) library for drag-and-drop functionality.

There there a variety of components that utilize drag-and-drop.

## Toolbar

[DragAndDropToolbarButton](https://github.com/cybersemics/em/blob/main/src/components/DragAndDropToolbarButton.tsx) - Defines `canDrag`, `beginDrag`, `endDrag`, `canDrop` and `drop` for dragging or dropping a toolbar button when customizing the toolbar.

https://github.com/cybersemics/em/assets/750276/4950d843-1a12-4647-a511-5625def7311c

## Thoughts

[DragAndDropThought](https://github.com/cybersemics/em/blob/main/src/components/DragAndDropThought.tsx) - Defines `canDrag`, `beginDrag`, `endDrag`, `canDrop` and `drop` for dragging or dropping a thought. Used by the `Thought` component so that every thought can be dragged, and every thought can serve as a drop target (inserted before, i.e. as the previous sibling).

https://github.com/cybersemics/em/assets/750276/2d6c967c-8cb6-484e-ad66-9cc50cfdd35d

[DropChild](https://github.com/cybersemics/em/blob/main/src/components/DropChild.tsx) - Allows a thought to be dropped as a subthought of a thought that is empty or collapsed.

https://github.com/cybersemics/em/assets/750276/93ff603d-31fa-409c-baa4-5c6dabe5887c

[DropEnd](https://github.com/cybersemics/em/blob/main/src/components/DropEnd.tsx) - Allows a thought to be dropped at the end of a list of subthoughts.

https://github.com/cybersemics/em/assets/750276/4f2049b3-1599-4ada-a203-c7ebb0941240

Many DropEnd components can be rendered consecutively when there is a cliff, i.e. the depth decreases by more than 1:

https://github.com/cybersemics/em/assets/750276/5127e543-26d7-434e-8166-d6f26e4424e1

[DropUncle](https://github.com/cybersemics/em/blob/main/src/components/DropUncle.tsx) - Allows a thought to be dropped before the next hidden uncle. For example, in the video below, the thought `c` is dragged onto a `DropUncle` drop target that allows the user to drop the thought before the next hidden uncle `e` (after the hidden parent `a`).

https://github.com/cybersemics/em/assets/750276/4f6b0fec-c230-46a1-acfa-40932160ac62

[Favorites](https://github.com/cybersemics/em/blob/main/src/components/Favorites.tsx) (also contains a drop target) - Defines `canDrag`, `beginDrag`, `endDrag`, `canDrop` and `drop` for dragging or dropping a thought within the favorites panel.

https://github.com/cybersemics/em/assets/750276/6f631b27-738b-4716-8bb0-8f73bcd23836

## Quick drops

These drop targets slide out from the right side of the screen as soon as a drag begins, providing an alternative means of executing a command on a thought.

[QuickDropIcon](https://github.com/cybersemics/em/blob/main/src/components/QuickDropIcon.tsx)

https://github.com/cybersemics/em/assets/750276/0f94caa1-db57-4d2b-b732-4a96d2779cd3

- [DeleteDrop](https://github.com/cybersemics/em/blob/main/src/components/DeleteDrop.tsx)
- [CopyOneDrop](https://github.com/cybersemics/em/blob/main/src/components/CopyOneDrop.tsx)
- [ExportDrop](https://github.com/cybersemics/em/blob/main/src/components/ExportDrop.tsx)

## Drag-and-drop helper components

[DragAndDropContext](https://github.com/cybersemics/em/blob/main/src/components/DragAndDropContext.tsx) - Provide drag-and-drop context to the entire component hierarchy.

[DragOnly](https://github.com/cybersemics/em/blob/main/src/components/DragOnly.tsx) - A container fragment that only renders its children when `state.dragInProgress` is true. Strictly performance related. Useful for short circuiting child components with expensive selectors.

[DropHover](https://github.com/cybersemics/em/blob/main/src/components/DropHover.tsx) - Renders a blue bar at the insertion point when a valid drop target is being hovered over.

[DragAndDropSubthoughts](https://github.com/cybersemics/em/blob/main/src/components/DragAndDropSubthoughts.tsx) - Defines `canDrop` and `drop` for dropping a thought as a subthought (i.e. child). Used by `DropChild` and `DropEnd` since they both involve dropping a thought as a subthought.

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

1. [Don't cancel a pending drag](https://github.com/cybersemics/em/blob/799c7fab0ec28c1270ce95366e869f7d48fac890/.yarn/patches/react-dnd-touch-backend-npm-16.0.1-2b96ba84be.patch#L82) if `touchmove` events are less than the distance defined in `this.options.touchSlop`. Logic was moved up from [later in the function](https://github.com/cybersemics/em/blob/799c7fab0ec28c1270ce95366e869f7d48fac890/.yarn/patches/react-dnd-touch-backend-npm-16.0.1-2b96ba84be.patch#L106) and copied from other functions where `touchSlop` was already being respected.

2. Reset [\_mouseClientOffset](https://github.com/cybersemics/em/blob/799c7fab0ec28c1270ce95366e869f7d48fac890/.yarn/patches/react-dnd-touch-backend-npm-16.0.1-2b96ba84be.patch#L119) when a touch ends. This was previously only happening if drag-and-drop had begun, which was throwing off the distance calculation above.

3. Emit a custom [dragStart](https://github.com/cybersemics/em/blob/799c7fab0ec28c1270ce95366e869f7d48fac890/.yarn/patches/react-dnd-touch-backend-npm-16.0.1-2b96ba84be.patch#L73) event that can be consumed by event handlers. This change allows us to remove the competing timer in `useLongPress`, which could never be properly synced with the timer in `TouchBackendImpl`.

### react-dnd-touch-backend-patch-0040823149.patch

This patch is a result of https://github.com/cybersemics/em/pull/3138 and patches another edge case where `clearTimeout` is not called and multiple quick taps are interpreted as a single tap.
