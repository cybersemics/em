/* eslint-disable import/prefer-default-export */
import Thunk from '../@types/Thunk'
import { AlertType } from '../constants'
import getLatestActionLabel from '../util/getLastActionLabel'
import { alertActionCreator as alert } from './alert'

/** Action-creator for undo. */
export const undoActionCreator = (): Thunk => (dispatch, getState) => {
  const lastActionLabel = getLatestActionLabel(getState().undoPatches)

  dispatch({ type: 'undo' })

  if (!lastActionLabel) return

  dispatch(
    alert(`Undo: ${lastActionLabel}`, {
      alertType: AlertType.Undo,
    }),
  )
}
