import Shortcut from '../@types/Shortcut'
import Thunk from '../@types/Thunk'
import Timer from '../@types/Timer'
import { LATEST_SHORTCUT_DIAGRAM_DURATION, LATEST_SHORTCUT_LIMIT } from '../constants'
import addLatestShortcuts from './addLatestShortcuts'
import clearLatestShortcuts from './clearLatestShortcuts'

interface Options {
  clear?: number
}

let timeoutId: Timer | null = null

/** Clear timeout id. */
const clearTimer = () => {
  if (timeoutId) clearTimeout(timeoutId)
  timeoutId = null
}

/**
 * Adds latest shorcuts diagram to be shown in the screen. Also clears after certain interval.
 */
const showLatestShortcuts =
  (shortcut?: Shortcut, { clear }: Options = {}): Thunk =>
  (dispatch, getState) => {
    if (clear) {
      clearTimer()
      dispatch(clearLatestShortcuts())
      return
    }

    if (shortcut) {
      const exceedsLimit = getState().latestShortcuts.length + 1 > LATEST_SHORTCUT_LIMIT

      // Clear shortcuts if exceeds limit
      if (exceedsLimit) dispatch(clearLatestShortcuts())

      clearTimer()
      dispatch(addLatestShortcuts(shortcut))
      timeoutId = setTimeout(() => {
        dispatch(clearLatestShortcuts())
        clearTimer()
      }, LATEST_SHORTCUT_DIAGRAM_DURATION)
    }
  }

export default showLatestShortcuts
