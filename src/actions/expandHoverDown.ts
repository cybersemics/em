import DropThoughtZone from '../@types/DropThoughtZone'
import Path from '../@types/Path'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import Timer from '../@types/Timer'
import { clearExpandDownActionCreator as clearExpandDown } from '../actions/clearExpandDown'
import { AlertType, EXPAND_HOVER_DELAY } from '../constants'
import expandThoughts from '../selectors/expandThoughts'
import getChildren from '../selectors/getChildren'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import hashPath from '../util/hashPath'
import head from '../util/head'
import pathToContext from '../util/pathToContext'

let expandDownTimer: Timer | null = null

/** Clears active delayed dispatch. */
const clearTimer = () => {
  if (expandDownTimer) {
    clearTimeout(expandDownTimer)
    expandDownTimer = null
  }
}

/** Delays dispatch of expandHoverDown. */
const expandHoverDownDebounced =
  (path: Path): Thunk =>
  (dispatch, getState) => {
    clearTimer()
    expandDownTimer = setTimeout(() => {
      const state = getState()
      // abort if dragging over quick drop components
      if (state.alert?.alertType === AlertType.DeleteDropHint || state.alert?.alertType === AlertType.CopyOneDropHint)
        return
      dispatch({ type: 'expandHoverDown', path })
      expandDownTimer = null
    }, EXPAND_HOVER_DELAY)
  }
/** Calculates the expanded context due to hover expansion on empty child drop. */
const expandDown = (state: State, { path }: { path: Path }): State => ({
  ...state,
  expanded: { ...state.expanded, ...expandThoughts(state, path) },
  expandHoverDownPaths: { ...state.expandHoverDownPaths, [hashPath(path)]: path },
})

/** Expands state.hoveringPath after a delay. Only expands if it is a valid Path with children and it is not already expanded. Expands using state.expandHoverDownPaths so that it can be toggled independently from autoexpansion with expandThoughts. */
export const expandHoverDownActionCreator = (): Thunk => (dispatch, getState) => {
  const state = getState()

  const { hoveringPath, hoverZone, expandHoverDownPaths, dragInProgress } = state

  // true if hovering over a valid Path with children
  const shouldExpand =
    hoverZone === DropThoughtZone.SubthoughtsDrop && hoveringPath && getChildren(state, head(hoveringPath)).length > 0

  if (!dragInProgress) {
    clearTimer()
    dispatch(clearExpandDown())
    return
  } else if (!shouldExpand) {
    clearTimer()
    return
  }

  /** Check if current state.hoveringPath is already expanded. */
  const isAlreadyExpanded = () => {
    return hoveringPath && pathToContext(state, hoveringPath) && expandHoverDownPaths[head(hoveringPath)]
  }

  if (hoveringPath && !isAlreadyExpanded()) {
    dispatch(expandHoverDownDebounced(hoveringPath))
  }
}

export default expandDown

// Register this action's metadata
registerActionMetadata('expandHoverDown', {
  undoable: false,
})
