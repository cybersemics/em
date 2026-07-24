/* eslint-disable import/prefer-default-export */
import Thunk from '../@types/Thunk'
import { AlertType } from '../constants'
import getLatestActionLabel from '../util/getLastActionLabel'
import { alertActionCreator as alert } from './alert'

/** Action-creator for redo. */
export const redoActionCreator = (): Thunk => (dispatch, getState) => {
  const lastActionLabel = getLatestActionLabel(getState().redoPatches)

  dispatch({ type: 'redo' })

  if (!lastActionLabel) return

  dispatch(
    alert(`Redo: ${lastActionLabel}`, {
      alertType: AlertType.Redo,
    }),
  )
}
