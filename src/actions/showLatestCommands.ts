/* eslint-disable import/prefer-default-export */
import Command from '../@types/Command'
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
 * Adds latest commands diagram to be shown in the screen. Also clears after certain interval.
 */
export const showLatestCommandsActionCreator =
  (command?: Command, { clear }: Options = {}): Thunk =>
  (dispatch, getState) => {
    if (clear) {
      clearTimer()
      dispatch(clearLatestShortcuts())
      return
    }

    if (command) {
      const exceedsLimit = getState().latestCommands.length + 1 > LATEST_SHORTCUT_LIMIT

      // Clear commands if exceeds limit
      if (exceedsLimit) dispatch(clearLatestShortcuts())

      clearTimer()
      dispatch(addLatestShortcutsActionCreator(command))
      timeoutId = setTimeout(() => {
        dispatch(clearLatestShortcuts())
        clearTimer()
      }, LATEST_SHORTCUT_DIAGRAM_DURATION)
    }
  }
