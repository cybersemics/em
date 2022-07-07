import Path from '../@types/Path'
import Thunk from '../@types/Thunk'
import Timer from '../@types/Timer'
import { DROP_TARGET, EXPAND_HOVER_DELAY } from '../constants'
import { getChildren } from '../selectors/getChildren'
import head from '../util/head'
import headId from '../util/headId'
import pathToContext from '../util/pathToContext'
import clearExpandBottom from './clearExpandBottom'
import expandBottom from './expandBottom'

// eslint-disable-next-line prefer-const
let expandBottomTimer: Timer | null = null

/**
 * Handles expansion of the context due to hover on the thought's empty drop.
 */
const expandOnHoverBottom = (): Thunk => (dispatch, getState) => {
  const state = getState()

  const { hoveringPath, hoverId, expandHoverBottomPaths, dragInProgress } = state

  const hoveringContext = hoveringPath && pathToContext(state, hoveringPath)

  const shouldExpand =
    hoverId === DROP_TARGET.EmptyDrop && hoveringPath && getChildren(state, head(hoveringPath)).length > 0

  /** Clears active delayed dispatch. */
  const clearTimer = () => {
    if (expandBottomTimer) {
      clearTimeout(expandBottomTimer)
      expandBottomTimer = null
    }
  }

  const shouldCancel = !dragInProgress

  if (shouldCancel) dispatch(clearExpandBottom())

  if (!shouldExpand) {
    clearTimer()
    return
  }

  /** Delays dispatch of expandBottom. */
  const delayedDispatch = (path: Path) => {
    expandBottomTimer = setTimeout(() => {
      dispatch(
        expandBottom({
          path,
        }),
      )
      expandBottomTimer = null
    }, EXPAND_HOVER_DELAY)
  }

  const parentId = headId(hoveringPath!)

  /** Check if current hovering context is already has active expansion. */
  const isAlreadyExpanded = () => hoveringContext && expandHoverBottomPaths[parentId]

  if (shouldExpand && hoveringPath && !isAlreadyExpanded()) {
    clearTimer()
    delayedDispatch(hoveringPath)
  }
}

export default expandOnHoverBottom
