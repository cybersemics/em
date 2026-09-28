/* eslint-disable import/prefer-default-export */
import Command from '../@types/Command'
import Thunk from '../@types/Thunk'
import Timer from '../@types/Timer'
import { LATEST_COMMAND_DIAGRAM_DURATION, LATEST_COMMAND_LIMIT } from '../constants'
import ministore from '../stores/ministore'
import { addLatestCommandsActionCreator } from './addLatestCommands'
import { clearLatestCommandsActionCreator as clearLatestCommands } from './clearLatestCommands'

interface Options {
  clear?: number
}

/** The pending clear of the latest commands diagram. A ministore whose dispose clears the timer, so that resetStores cancels it between tests. The timer is null whenever none is armed. */
const latestCommandsTimerStore = ministore<{ timer: Timer | null }>(
  { timer: null },
  { dispose: ({ timer }) => clearTimeout(timer ?? undefined) },
)

/** Clears the pending clear of the latest commands diagram. */
const clearTimer = () => {
  clearTimeout(latestCommandsTimerStore.getState().timer ?? undefined)
  latestCommandsTimerStore.update({ timer: null })
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
      const timer = setTimeout(() => {
        latestCommandsTimerStore.update({ timer: null })
        dispatch(clearLatestCommands())
      }, LATEST_COMMAND_DIAGRAM_DURATION)
      latestCommandsTimerStore.update({ timer })
    }
  }
