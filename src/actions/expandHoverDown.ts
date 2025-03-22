import DropThoughtZone from '../@types/DropThoughtZone'
import Path from '../@types/Path'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import Timer from '../@types/Timer'
import { clearExpandDownActionCreator as clearExpandDown } from '../actions/clearExpandDown'
import { AlertType, EXPAND_HOVER_DELAY, HOME_PATH } from '../constants'
import expandThoughts from '../selectors/expandThoughts'
import getChildren from '../selectors/getChildren'
import equalPath from '../util/equalPath'
import hashPath from '../util/hashPath'
import head from '../util/head'
import isDescendantPath from '../util/isDescendantPath'
import keyValueBy from '../util/keyValueBy'
import pathToContext from '../util/pathToContext'

interface HoverStateTracking {
  previousPath: Path | null
  timer: Timer | null
  previousDragInProgress: boolean
  lastExpandedPath: Path | null
  lastCollapsedPath: Path | null
  forcePathReexpansion: boolean // Flag to force re-expanding a previously expanded path
  recentlyExitedPath: Path | null
  previousHoverZone: DropThoughtZone | undefined
}

const hoverState: HoverStateTracking = {
  previousPath: null,
  timer: null,
  previousDragInProgress: false,
  lastExpandedPath: null,
  lastCollapsedPath: null,
  forcePathReexpansion: false,
  recentlyExitedPath: null,
  previousHoverZone: undefined,
}

/** Clears active delayed dispatch. */
const clearTimer = () => {
  if (hoverState.timer) {
    clearTimeout(hoverState.timer)
    hoverState.timer = null
  }
}

/**
 * Resets all hover expansion state.
 * Call this when a drag operation ends or to force a fresh evaluation.
 */
const resetHoverState = () => {
  hoverState.previousPath = null
  hoverState.lastExpandedPath = null
  hoverState.lastCollapsedPath = null
  hoverState.recentlyExitedPath = null
  hoverState.previousHoverZone = undefined
  hoverState.forcePathReexpansion = false
  clearTimer()
}

/**
 * Checks if a hovering path is inside an expanded path.
 * This handles nested thoughts properly.
 */
const isPathInsideExpandedPath = (
  hoveringPath: Path,
  expandedPath: Path,
  hoverZone: DropThoughtZone | undefined,
): boolean => {
  // If there's no hovering path or hover zone, we can't be inside
  if (!hoveringPath || hoverZone === undefined) return false
  if (hoveringPath === HOME_PATH) return false

  // Check if paths are exactly equal
  const isEqual = equalPath(hoveringPath, expandedPath)

  // Check if hovering path is a descendant of expanded path
  const isDescendant = isDescendantPath(hoveringPath, expandedPath)

  // Check if hovering path is an ancestor of expanded path (only for SubthoughtsDrop)
  const isAncestor = isDescendantPath(expandedPath, hoveringPath)

  // For ThoughtDrop (hovering above), we're never inside the path itself
  if (hoverZone === DropThoughtZone.ThoughtDrop) {
    return isDescendant && !isEqual
  }

  // For SubthoughtsDrop, we're inside if:
  // 1. We're hovering over this exact path, or
  // 2. We're hovering over one of its descendants, or
  // 3. We're hovering over an ancestor
  return isEqual || isDescendant || (hoverZone === DropThoughtZone.SubthoughtsDrop && isAncestor)
}

/**
 * Check if a path is already expanded in the current state.
 */
const isPathAlreadyExpanded = (state: State, path: Path): boolean => {
  if (!path || !pathToContext(state, path)) return false

  const pathHash = hashPath(path)
  // Check direct match
  if (state.expandHoverDownPaths[pathHash]) return true

  // If we have a head-based match, also consider it expanded
  // This handles certain edge cases where the hash might differ but the logical path is the same
  return !!state.expandHoverDownPaths[head(path)]
}

/**
 * Unified debounced function for both expanding and collapsing.
 * This handles the main logic for when to expand or collapse.
 */
const hoverPathDebounced =
  (path: Path): Thunk =>
  (dispatch, getState) => {
    clearTimer()
    hoverState.timer = setTimeout(() => {
      const state = getState()
      const { hoverZone, expandHoverDownPaths, dragInProgress } = state

      // Track hover zone changes
      const hoverZoneChanged = hoverState.previousHoverZone !== hoverZone
      hoverState.previousHoverZone = hoverZone

      // Abort if dragging over quick drop components
      if (state.alert?.alertType === AlertType.DeleteDropHint || state.alert?.alertType === AlertType.CopyOneDropHint)
        return

      // If drag is no longer in progress, clear all expanded paths
      if (!dragInProgress) {
        clearTimer()
        dispatch(clearExpandDown())
        return
      }

      // Get all current expanded paths
      const expandedPaths = Object.values(expandHoverDownPaths) as Path[]

      // For each expanded path, check if it should remain expanded with the current path
      const expandedPathsToKeep = expandedPaths.filter(expandedPath => {
        // Keep if the current path is inside this expanded path
        if (isPathInsideExpandedPath(path, expandedPath, hoverZone)) {
          return true
        }

        // Keep if this expanded path is inside the current path
        if (isPathInsideExpandedPath(expandedPath, path, hoverZone)) {
          return true
        }

        // Otherwise, it should be collapsed
        return false
      })

      // Paths that should be collapsed are those not in expandedPathsToKeep
      const pathsToCollapse = expandedPaths.filter(
        expandedPath => !expandedPathsToKeep.some(keepPath => equalPath(keepPath, expandedPath)),
      )

      // Find the highest-level paths to collapse
      const parentPathsToCollapse = pathsToCollapse.filter(
        pathToCollapse =>
          !pathsToCollapse.some(
            otherPath => !equalPath(pathToCollapse, otherPath) && isDescendantPath(pathToCollapse, otherPath),
          ),
      )

      // Handle collapsing paths if needed
      if (parentPathsToCollapse.length > 0) {
        for (const pathToCollapse of parentPathsToCollapse) {
          // Always collapse if:
          // 1. It's a different path than the last one we collapsed
          // 2. The hover zone has changed
          // 3. This is a path we recently exited (needs to be collapsed again)
          const shouldCollapseAgain =
            hoverZoneChanged ||
            (hoverState.recentlyExitedPath && equalPath(hoverState.recentlyExitedPath, pathToCollapse)) ||
            !hoverState.lastCollapsedPath ||
            !equalPath(hoverState.lastCollapsedPath, pathToCollapse)

          if (shouldCollapseAgain) {
            dispatch({ type: 'collapseHoverDown', path: pathToCollapse })
            hoverState.lastCollapsedPath = pathToCollapse

            // If this is the same as our recently exited path, clear that state
            if (hoverState.recentlyExitedPath && equalPath(hoverState.recentlyExitedPath, pathToCollapse)) {
              hoverState.recentlyExitedPath = null
            }
          }
        }
      }

      // Determine if this path should be expanded
      const shouldExpand =
        hoverZone === DropThoughtZone.SubthoughtsDrop && path && getChildren(state, head(path)).length > 0

      // Check if path needs to be expanded
      const currentPathExpanded = isPathAlreadyExpanded(state, path)

      if (shouldExpand && path && (!currentPathExpanded || hoverState.forcePathReexpansion)) {
        dispatch({ type: 'expandHoverDown', path })
        hoverState.lastExpandedPath = path

        // If we're expanding a path we just collapsed, mark it as a special case
        if (hoverState.lastCollapsedPath && equalPath(hoverState.lastCollapsedPath, path)) {
          hoverState.lastCollapsedPath = null
        }

        // Reset the force flag after using it
        hoverState.forcePathReexpansion = false
      }

      hoverState.timer = null
    }, EXPAND_HOVER_DELAY)
  }

/** Expands a path by updating the state.expanded and state.expandHoverDownPaths. */
export const expandDown = (state: State, { path }: { path: Path }): State => {
  // Ensure we're not trying to expand a null path
  if (!path) return state

  const expandedThoughts = expandThoughts(state, path)

  return {
    ...state,
    expanded: { ...state.expanded, ...expandedThoughts },
    expandHoverDownPaths: { ...state.expandHoverDownPaths, [hashPath(path)]: path },
  }
}

/** Collapses a path by removing it and its descendants from state.expanded and state.expandHoverDownPaths. */
export const collapseDown = (state: State, { path }: { path: Path }): State => {
  // Ensure we're not trying to collapse a null path
  if (!path) return state

  // Filter out paths that are descendants of the collapsed path or are the path itself
  const newExpanded = keyValueBy(state.expanded, (key, expandedPath) =>
    !equalPath(expandedPath, path) && !isDescendantPath(expandedPath, path) ? { [key]: expandedPath } : null,
  )

  const newExpandHoverDownPaths = keyValueBy(state.expandHoverDownPaths, (key, expandHoverPath) =>
    !equalPath(expandHoverPath, path) && !isDescendantPath(expandHoverPath, path) ? { [key]: expandHoverPath } : null,
  )

  return {
    ...state,
    expanded: newExpanded,
    expandHoverDownPaths: newExpandHoverDownPaths,
  }
}

/**
 * Action creator that tracks hover path changes and triggers expanding/collapsing.
 */
const hoverPathActionCreator = (): Thunk => (dispatch, getState) => {
  const state = getState()
  const { hoveringPath, dragInProgress, hoverZone } = state

  // Detect the beginning of a new drag operation
  if (dragInProgress && !hoverState.previousDragInProgress) {
    // Reset state at the start of a new drag operation
    resetHoverState()
  }

  // Update previous drag state for next comparison
  hoverState.previousDragInProgress = dragInProgress

  // If no hovering path or drag not in progress, clear everything
  if (!hoveringPath || !dragInProgress) {
    resetHoverState()
    return
  }

  // Check for significant path change (completely moving out of nested thoughts)
  const isSignificantPathChange =
    hoverState.previousPath &&
    hoveringPath &&
    !isPathInsideExpandedPath(hoveringPath, hoverState.previousPath, hoverZone) &&
    !isPathInsideExpandedPath(hoverState.previousPath, hoveringPath, hoverZone)

  // If we've completely moved out of a path structure, force a clean collapse
  if (isSignificantPathChange) {
    // This path is completely different - not a descendant or ancestor
    // Track it for special handling
    hoverState.recentlyExitedPath = hoverState.previousPath

    // We need to force a collapse of the previously expanded paths
    // Set a flag to ensure we immediately evaluate this new path
    hoverState.forcePathReexpansion = true
  }
  // If the path has changed, mark the previous path as recently exited
  // This helps us track when we move away from a path that might need to be collapsed
  else if (hoverState.previousPath && !equalPath(hoverState.previousPath, hoveringPath)) {
    hoverState.recentlyExitedPath = hoverState.previousPath
  }

  // Enhanced path change detection
  let shouldProcess = false

  // Process in these cases:
  // 1. No previous path (first hover)
  // 2. Path actually changed
  // 3. Hover zone changed (even if path is the same)
  // 4. We're forcing path reexpansion
  // 5. Significant path change (moving completely out of a thought structure)
  if (
    !hoverState.previousPath ||
    !equalPath(hoverState.previousPath, hoveringPath) ||
    hoverState.previousHoverZone !== hoverZone ||
    hoverState.forcePathReexpansion ||
    isSignificantPathChange
  ) {
    shouldProcess = true
  }
  // Special case 1: If we hover away and back to the same path,
  // force path reexpansion to ensure expanding works
  else if (
    hoverState.previousPath &&
    equalPath(hoverState.previousPath, hoveringPath) &&
    hoverState.lastCollapsedPath &&
    equalPath(hoverState.lastCollapsedPath, hoveringPath)
  ) {
    hoverState.forcePathReexpansion = true
    shouldProcess = true
  }
  // Special case 2: If we're on the same path that was recently expanded,
  // we may need to collapse it again if user hovers away briefly
  else if (
    hoverState.lastExpandedPath &&
    equalPath(hoveringPath, hoverState.lastExpandedPath) &&
    hoverState.recentlyExitedPath &&
    equalPath(hoverState.recentlyExitedPath, hoveringPath)
  ) {
    hoverState.forcePathReexpansion = true
    shouldProcess = true
  }

  if (shouldProcess) {
    dispatch(hoverPathDebounced(hoveringPath))
    hoverState.previousPath = hoveringPath
  }
}

export default hoverPathActionCreator
