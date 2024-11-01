import Shortcut from '../@types/Shortcut'
import Thunk from '../@types/Thunk'
import Timer from '../@types/Timer'
import { addLatestShortcutsActionCreator } from '../actions/addLatestShortcuts'
import { clearLatestShortcutsActionCreator as clearLatestShortcuts } from '../actions/clearLatestShortcuts'
import { LATEST_SHORTCUT_DIAGRAM_DURATION, LATEST_SHORTCUT_LIMIT } from '../constants'

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
 * Adds latest shortcuts diagram to be shown in the screen. Also clears after certain interval.
 */
export const showLatestShortcutsActionCreator =
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
      dispatch(addLatestShortcutsActionCreator(shortcut))
      timeoutId = setTimeout(() => {
        dispatch(clearLatestShortcuts())
        clearTimer()
      }, LATEST_SHORTCUT_DIAGRAM_DURATION)
    }
  }
