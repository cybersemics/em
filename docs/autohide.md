# Autohide and Viewport Stabilization

## Overview

The autohide system removes dead space left by hidden thoughts while preventing jarring viewport jumps.

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

In the [LayoutTree](https://github.com/cybersemics/em/blob/e957a14006d19d225eb99c752611bc493e4bba7b/src/components/LayoutTree.tsx#L90), the `spaceAbove` value is calculated by accumulating the height of all hidden thoughts above the cursor.

**Key Logic:**
- `spaceAbove` accumulates the height of all hidden thoughts that are above the cursor
- Hidden thoughts (`!isVisible && !belowCursor`) contribute to `spaceAbove` but not to visual layout
- This represents the exact amount of space that needs to be "cropped" from above

### 2. Viewport Extension and Cropping (`useHideSpaceAbove` hook)

The `useHideSpaceAbove` hook in `src/components/LayoutTree.tsx` manages the compensating scroll:

````typescript
const useHideSpaceAbove = (spaceAbove: number) => {
  const scrollY = window.scrollY
  const viewportHeight = viewportStore.useSelector(viewport => viewport.innerHeight)
  
  // Extend spaceAbove to at least viewport height for scroll room
  const spaceAboveExtended = Math.max(spaceAbove, viewportHeight)
  
  const spaceAboveLast = useRef(spaceAboveExtended)
  
  // When spaceAbove changes, scroll by the delta to maintain position
  useEffect(() => {
    const spaceAboveDelta = spaceAboveExtended - spaceAboveLast.current
    window.scrollTo({ top: scrollY - spaceAboveDelta })
    spaceAboveLast.current = spaceAboveExtended
  }, [spaceAboveExtended])
}
````

**Key Mechanisms:**

1. **Extension**: `spaceAboveExtended = Math.max(spaceAbove, viewportHeight)` ensures there's always at least one viewport height of scrollable space above
2. **Delta Calculation**: When `spaceAbove` changes, calculate the difference from the previous value
3. **Compensating Scroll**: Scroll up by exactly the delta amount so visible thoughts appear stationary

### 3. Transform-Based Positioning

The container is translated to physically remove the hidden space while maintaining scroll room:

````typescript
<div
  style={{
    transform: `translateY(${-spaceAboveExtended + viewportHeight}px)`,
  }}
>
````

The transform calculation:
- `-spaceAboveExtended`: Moves content up to "crop" the hidden space
- `+viewportHeight`: Adds back viewport height to ensure scroll room

## The Complete Flow

1. **Navigation Occurs**: User navigates deeper, some ancestor thoughts become hidden
2. **Space Calculation**: `spaceAbove` recalculates to include newly hidden thoughts
3. **Extension**: `spaceAboveExtended` ensures minimum viewport height of scroll space
4. **Compensating Scroll**: Window scrolls up by the delta to maintain visual position
5. **Transform Application**: Container translates to physically remove the space
6. **Stable Result**: Visible thoughts appear unmoved despite document height changes

## Related Issues

- Original issue: [#1751](https://github.com/cybersemics/em/issues/1751)
- Uncle issue: [#3055](https://github.com/cybersemics/em/issues/3055)