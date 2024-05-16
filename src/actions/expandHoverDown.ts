import DropThoughtZone from '../@types/DropThoughtZone'
import Path from '../@types/Path'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import Timer from '../@types/Timer'
import { clearExpandDownActionCreator as clearExpandDown } from '../actions/clearExpandDown'
import { AlertType, EXPAND_HOVER_DELAY } from '../constants'
import expandThoughts from '../selectors/expandThoughts'
import getChildren from '../selectors/getChildren'
import hashPath from '../util/hashPath'
import head from '../util/head'
import pathToContext from '../util/pathToContext'

// eslint-disable-next-line prefer-const
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

/** Handles expansion of the context due to hover on the thought's empty drop. */
export const expandHoverDownActionCreator = (): Thunk => (dispatch, getState) => {
  const state = getState()

  const { hoveringPath, hoverZone, expandHoverDownPaths, dragInProgress } = state

  const hoveringContext = hoveringPath && pathToContext(state, hoveringPath)

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

  /** Check if current hovering context is already has active expansion. */
  const isAlreadyExpanded = () => {
    // hoveringPath truthiness already checked in condition below
    const parentId = head(hoveringPath!)
    return hoveringContext && expandHoverDownPaths[parentId]
  }

  if (shouldExpand && hoveringPath && !isAlreadyExpanded()) {
    dispatch(expandHoverDownDebounced(hoveringPath))
  }
}

export default expandDown
