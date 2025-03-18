import DropThoughtZone from '../@types/DropThoughtZone'
import Path from '../@types/Path'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import Timer from '../@types/Timer'
import { EXPAND_HOVER_DELAY, HOME_PATH } from '../constants'
import equalPath from '../util/equalPath'
import hashPath from '../util/hashPath'
import isDescendantPath from '../util/isDescendantPath'

let collapseDownTimer: Timer | null = null

// Track the previous hovering path to detect changes
let previousHoveringPath: Path | null = null

/** Clears active delayed dispatch. */
const clearTimer = () => {
  if (collapseDownTimer) {
    clearTimeout(collapseDownTimer)
    collapseDownTimer = null
  }
}

/** Delays dispatch of collapseHoverDown. */
const collapseHoverDownDebounced =
  (path: Path): Thunk =>
  dispatch => {
    clearTimer()
    collapseDownTimer = setTimeout(() => {
      dispatch({ type: 'collapseHoverDown', path })
      collapseDownTimer = null
    }, EXPAND_HOVER_DELAY)
  }

/**
 * Removes a path and all its descendants from expandHoverDownPaths and expanded states.
 * This ensures that when a parent is collapsed, all its children are collapsed as well.
 */
const collapseHoverDown = (state: State, { path }: { path: Path }): State => {
  // Get all paths from both expanded and expandHoverDownPaths states
  const expandedPaths = Object.entries(state.expanded).map(([_, path]) => path)
  const expandHoverDownPaths = Object.entries(state.expandHoverDownPaths).map(([_, path]) => path)

  // Find all paths that are descendants of the collapsed path
  // or are the path itself (inclusive)
  const expandedPathsToRemove = expandedPaths.filter(
    expandedPath => equalPath(expandedPath, path) || isDescendantPath(expandedPath, path),
  )

  const expandHoverPathsToRemove = expandHoverDownPaths.filter(
    expandedPath => equalPath(expandedPath, path) || isDescendantPath(expandedPath, path),
  )

  // Create new states by removing all descendant paths
  const newExpanded = { ...state.expanded }
  const newExpandHoverDownPaths = { ...state.expandHoverDownPaths }

  // Remove all expanded paths that are descendants of the collapsed path
  expandedPathsToRemove.forEach(pathToRemove => {
    const hashedPath = hashPath(pathToRemove)
    if (newExpanded[hashedPath]) {
      delete newExpanded[hashedPath]
    }
  })

  // Remove all expandHoverDownPaths that are descendants of the collapsed path
  expandHoverPathsToRemove.forEach(pathToRemove => {
    const hashedPath = hashPath(pathToRemove)
    if (newExpandHoverDownPaths[hashedPath]) {
      delete newExpandHoverDownPaths[hashedPath]
    }
  })

  return {
    ...state,
    expanded: newExpanded,
    expandHoverDownPaths: newExpandHoverDownPaths,
  }
}

/**
 * Checks if the hovering path is inside an expanded path.
 */
const isHoveringPathInsideExpandedPath = (
  hoveringPath: Path,
  expandedPath: Path,
  hoverZone: DropThoughtZone | undefined,
): boolean => {
  // If there's no hovering path or no hover zone, we can't be inside
  if (!hoveringPath || hoverZone === undefined) return false

  if (hoveringPath === HOME_PATH) return false

  // Check if paths are exactly equal
  const isEqual = equalPath(hoveringPath, expandedPath)

  // Check if hovering path is a descendant of expanded path
  const isDescendant = isDescendantPath(hoveringPath, expandedPath)

  // Check if hovering path is an ancestor of expanded path (only relevant for SubthoughtsDrop)
  const isAncestor = isDescendantPath(expandedPath, hoveringPath)

  // For ThoughtDrop (hovering above), we're never inside the path itself
  if (hoverZone === DropThoughtZone.ThoughtDrop) {
    return isDescendant && !isEqual
  }

  // For SubthoughtsDrop or any other zone, we're inside if:
  // 1. We're hovering over this exact path, or
  // 2. We're hovering over one of its descendants, or
  // 3. For SubthoughtsDrop specifically, we're hovering over an ancestor
  return isEqual || isDescendant || (hoverZone === DropThoughtZone.SubthoughtsDrop && isAncestor)
}

/**
 * Collapses hover expanded thoughts when the hovering path exits them.
 * This simplified implementation focuses on directly comparing which expanded paths
 * should collapse when the hovering path changes.
 */
export const collapseHoverDownActionCreator = (): Thunk => (dispatch, getState) => {
  const state = getState()
  const { hoveringPath, hoverZone, expandHoverDownPaths, dragInProgress } = state

  // If there's no hovering path or no drag in progress, clear timer and return
  if (!hoveringPath || !dragInProgress) {
    clearTimer()
    previousHoveringPath = null
    return
  }

  // Extract all expanded paths from state
  const expandedPaths = Object.values(expandHoverDownPaths) as Path[]

  // If there are no expanded paths, nothing to collapse
  if (expandedPaths.length === 0) {
    clearTimer()
    previousHoveringPath = hoveringPath
    return
  }

  // Check if the hovering path has changed
  const hoveringPathChanged = !previousHoveringPath || !equalPath(previousHoveringPath, hoveringPath)

  if (!hoveringPathChanged) {
    // No change in hovering path, nothing to do
    return
  }

  // Find parent paths we need to collapse
  // These are paths that:
  // 1. We're no longer inside, and
  // 2. Aren't children of other paths we're already collapsing (to avoid redundant collapses)

  // Identify which expanded paths we're inside of
  const currentlyInsidePaths = expandedPaths.filter(expandedPath =>
    isHoveringPathInsideExpandedPath(hoveringPath, expandedPath, hoverZone),
  )

  //Find paths we need to collapse (all expanded paths we're not inside)
  const allPathsToCollapse = expandedPaths.filter(
    expandedPath => !currentlyInsidePaths.some(insidePath => equalPath(insidePath, expandedPath)),
  )

  // Find only the highest-level paths (parents) to collapse
  // We don't need to explicitly collapse children because the reducer will handle that
  const parentPathsToCollapse = allPathsToCollapse.filter(
    pathToCollapse =>
      // A path is a "parent path" if no other path in the collapse list is its ancestor
      !allPathsToCollapse.some(
        otherPath => !equalPath(pathToCollapse, otherPath) && isDescendantPath(pathToCollapse, otherPath),
      ),
  )

  // If we have parent paths to collapse
  if (parentPathsToCollapse.length > 0) {
    // Prioritize direct match with previous hovering path if exists
    const directMatches = previousHoveringPath
      ? parentPathsToCollapse.filter(path => equalPath(path, previousHoveringPath))
      : []

    if (directMatches.length > 0) {
      const pathToCollapse = directMatches[0]
      dispatch(collapseHoverDownDebounced(pathToCollapse))
    } else {
      // No direct match, pick the first parent path
      const pathToCollapse = parentPathsToCollapse[0]
      dispatch(collapseHoverDownDebounced(pathToCollapse))
    }
  } else {
    clearTimer()
  }

  // Update previous hovering path for next comparison
  previousHoveringPath = hoveringPath
}

export default collapseHoverDown
