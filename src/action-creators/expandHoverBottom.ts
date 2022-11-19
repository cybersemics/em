import DropThoughtZone from '../@types/DropThoughtZone'
import Path from '../@types/Path'
import Thunk from '../@types/Thunk'
import Timer from '../@types/Timer'
import { AlertType, EXPAND_HOVER_DELAY } from '../constants'
import { getChildren } from '../selectors/getChildren'
import head from '../util/head'
import pathToContext from '../util/pathToContext'
import clearExpandBottom from './clearExpandBottom'

// eslint-disable-next-line prefer-const
let expandBottomTimer: Timer | null = null

/** Clears active delayed dispatch. */
const clearTimer = () => {
  if (expandBottomTimer) {
    clearTimeout(expandBottomTimer)
    expandBottomTimer = null
  }
}

/** Delays dispatch of expandHoverBottom. */
const expandHoverBottomDebounced =
  (path: Path): Thunk =>
  (dispatch, getState) => {
    clearTimer()
    expandBottomTimer = setTimeout(() => {
      const state = getState()
      // abort if dragging over quick drop components
      if (state.alert?.alertType === AlertType.DeleteDropHint || state.alert?.alertType === AlertType.CopyOneDropHint)
        return
      dispatch({ type: 'expandHoverBottom', path })
      expandBottomTimer = null
    }, EXPAND_HOVER_DELAY)
  }

/** Handles expansion of the context due to hover on the thought's empty drop. */
const expandHoverBottom = (): Thunk => (dispatch, getState) => {
  const state = getState()

  const { hoveringPath, hoverZone, expandHoverBottomPaths, dragInProgress } = state

  const hoveringContext = hoveringPath && pathToContext(state, hoveringPath)

  const shouldExpand =
    hoverZone === DropThoughtZone.SubthoughtsDrop && hoveringPath && getChildren(state, head(hoveringPath)).length > 0

  if (!dragInProgress) {
    clearTimer()
    dispatch(clearExpandBottom())
    return
  } else if (!shouldExpand) {
    clearTimer()
    return
  }

  /** Check if current hovering context is already has active expansion. */
  const isAlreadyExpanded = () => {
    // hoveringPath truthiness already checked in condition below
    const parentId = head(hoveringPath!)
    return hoveringContext && expandHoverBottomPaths[parentId]
  }

  if (shouldExpand && hoveringPath && !isAlreadyExpanded()) {
    dispatch(expandHoverBottomDebounced(hoveringPath))
  }
}

export default expandHoverBottom
