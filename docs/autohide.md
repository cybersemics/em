# Autohide and Viewport Stabilization

## Overview

The autohide system removes dead space left by hidden thoughts while preventing jarring viewport jumps. In the code this is referred to as "autocrop".

## Problem

When navigating deep into the hierarchy:

1. Many ancestor thoughts and their siblings become hidden and virtualized
2. These hidden thoughts create large amounts of blank space above and below the visible thoughts
3. Removing them from the flow changes the document height
4. Without compensation, this causes visible thoughts to "jump" up

## Solution

1. Translate all visible thoughts up to cover the empty space.
2. Scroll up by the exact same amount.

If timed correctly, the visible thoughts remain stationary and do not appear to move relative to the viewport. Only the scroll bar moves.

### 1. Space Calculation in LayoutTree

In [LayoutTree](../src/components/LayoutTree.tsx), `spaceAbove` is computed by reducing over `treeThoughts` and accumulating the height of all hidden thoughts above the cursor.

**Key Logic:**
- `spaceAbove` accumulates the height of any thought whose tracked size is `!isVisible && !node.belowCursor`
- Hidden thoughts above the cursor contribute to `spaceAbove` but are not laid out visually
- This represents the exact amount of space that needs to be "cropped" from above

### 2. Viewport Extension and Cropping (`useAutocrop` hook)

The `useAutocrop` hook in [src/components/LayoutTree.tsx](../src/components/LayoutTree.tsx) manages the compensating scroll and returns the number of pixels by which all thoughts should be shifted:

````typescript
const useAutocrop = (spaceAbove: number): number => {
  const scrollY = window.scrollY
  const viewportHeight = viewportStore.useSelector(viewport => viewport.innerHeight)

  // extend spaceAbove to be at least the height of the viewport so that there is room to scroll up
  const spaceAboveExtended = Math.max(spaceAbove, viewportHeight)

  const spaceAboveLast = useRef(spaceAboveExtended)

  // when spaceAbove changes, scroll by the same amount so that the thoughts appear to stay in the same place
  useEffect(() => {
    const spaceAboveDelta = spaceAboveExtended - spaceAboveLast.current
    window.scrollTo({ top: scrollY - spaceAboveDelta })
    spaceAboveLast.current = spaceAboveExtended
  }, [spaceAboveExtended])

  // add a full viewport height's space above to ensure that there is room to scroll by the same amount as spaceAbove
  return -spaceAboveExtended + viewportHeight
}
````

**Key Mechanisms:**

1. **Extension**: `spaceAboveExtended = Math.max(spaceAbove, viewportHeight)` ensures there is always at least one viewport height of scrollable space above
2. **Delta Calculation**: When `spaceAbove` changes, calculate the difference from the previous value
3. **Compensating Scroll**: Scroll up by exactly the delta amount so visible thoughts appear stationary

### 3. Transform-Based Positioning

The container is translated by the value returned from `useAutocrop` to physically remove the hidden space while maintaining scroll room:

````typescript
const autocrop = useAutocrop(spaceAbove)
// ...
<div style={{ transform: `translateY(${autocrop}px)` }} ref={ref}>
````

Since `autocrop = -spaceAboveExtended + viewportHeight`, the transform:
- `-spaceAboveExtended`: Moves content up to "crop" the hidden space
- `+viewportHeight`: Adds back viewport height to ensure scroll room

### 4. Tracking the Layout Tree Top

`useLayoutTreeTop` writes `(ref.current.offsetTop || 0) + autocrop` to `viewportStore.layoutTreeTop` whenever the autocrop value changes, so consumers (e.g. `scrollCursorIntoView`) can compute the cursor's position relative to the viewport even after the tree has been shifted.

## The Complete Flow

1. **Navigation Occurs**: User navigates deeper, some ancestor thoughts become hidden
2. **Space Calculation**: `spaceAbove` recalculates to include newly hidden thoughts
3. **Extension**: `spaceAboveExtended` ensures minimum viewport height of scroll space
4. **Compensating Scroll**: Window scrolls up by the delta to maintain visual position
5. **Transform Application**: Container translates by `autocrop` to physically remove the space
6. **layoutTreeTop Update**: The viewport store is updated so the rest of the app can locate the tree
7. **Stable Result**: Visible thoughts appear unmoved despite document height changes

## Related Issues

- Original issue: [#1751](https://github.com/cybersemics/em/issues/1751)
- Uncle issue: [#3055](https://github.com/cybersemics/em/issues/3055)
