/* eslint-disable import/prefer-default-export */
import Command from '../@types/Command'
import Thunk from '../@types/Thunk'
import Timer from '../@types/Timer'
import { LATEST_COMMAND_DIAGRAM_DURATION, LATEST_COMMAND_LIMIT } from '../constants'
import { addLatestCommandsActionCreator } from './addLatestCommands'
import { clearLatestCommandsActionCreator as clearLatestCommands } from './clearLatestCommands'

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
      dispatch(clearLatestCommands())
      return
    }

    if (command) {
      const exceedsLimit = getState().latestCommands.length + 1 > LATEST_COMMAND_LIMIT

      // Clear commands if exceeds limit
      if (exceedsLimit) dispatch(clearLatestCommands())

      clearTimer()
      dispatch(addLatestCommandsActionCreator(command))
      timeoutId = setTimeout(() => {
        dispatch(clearLatestCommands())
        clearTimer()
      }, LATEST_COMMAND_DIAGRAM_DURATION)
    }
  }
