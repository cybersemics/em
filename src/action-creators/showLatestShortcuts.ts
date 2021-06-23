import { clearLatestShortcuts, addLatestShortcuts } from '.'
import { Shortcut, Thunk } from '../types'
import { LATEST_SHORTCUT_DIAGRAM_DURATION, LATEST_SHORTCUT_LIMIT } from '../constants'

interface Options {
  clear?: number
}

let timeoutId: number | null = null

/** Clear timeout id. */
const clearTimeout = () => {
  if (timeoutId) window.clearTimeout(timeoutId)
  timeoutId = null
}

/**
 * Adds latest shorcuts diagram to be shown in the screen. Also clears after certain interval.
 */
const showLatestShortcuts = (shortcut?: Shortcut, { clear }: Options = {}): Thunk => (dispatch, getState) => {

  if (clear) {
    clearTimeout()
    dispatch(clearLatestShortcuts())
    return
  }

  if (shortcut) {
    const exceedsLimit = getState().latestShortcuts.length + 1 > LATEST_SHORTCUT_LIMIT

    // Clear shortcuts if exceeds limit
    if (exceedsLimit) dispatch(clearLatestShortcuts())

    clearTimeout()
    dispatch(addLatestShortcuts(shortcut))
    timeoutId = setTimeout(() => {
      dispatch(clearLatestShortcuts())
      clearTimeout()
    }, LATEST_SHORTCUT_DIAGRAM_DURATION)
  }
}

export default showLatestShortcuts
