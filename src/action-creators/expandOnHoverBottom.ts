import { Path, Thunk } from '../types'
import { DROP_TARGET, EXPAND_HOVER_DELAY } from '../constants'
import { hashContext, pathToContext } from '../util'
import { getChildren } from '../selectors'
import { clearExpandBottom, expandBottom } from '.'

// eslint-disable-next-line prefer-const
let expandBottomTimer: number | null = null

/**
 * Handles expansion of the context due to hover on the thought's empty drop.
 */
const expandOnHoverBottom = (): Thunk => (dispatch, getState) => {
  const state = getState()

  const { hoveringPath, hoverId, expandHoverBottomPaths, dragInProgress } = state

  const hoveringContext = hoveringPath && pathToContext(hoveringPath)

  const shouldExpand =
    hoverId === DROP_TARGET.EmptyDrop && hoveringPath && getChildren(state, pathToContext(hoveringPath)).length > 0

  /** Clears active delayed dispatch. */
  const clearTimeout = () => {
    if (expandBottomTimer) {
      window.clearTimeout(expandBottomTimer)
      expandBottomTimer = null
    }
  }

  const shouldCancel = !dragInProgress

  if (shouldCancel) dispatch(clearExpandBottom())

  if (!shouldExpand) {
    clearTimeout()
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

  /** Check if current hovering context is already has active expansion. */
  const isAlreadyExpanded = () => hoveringContext && expandHoverBottomPaths[hashContext(hoveringContext)]

  if (shouldExpand && hoveringPath && !isAlreadyExpanded()) {
    clearTimeout()
    delayedDispatch(hoveringPath)
  }
}

export default expandOnHoverBottom
