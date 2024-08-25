import { startCase } from 'lodash'
import Thunk from '../@types/Thunk'
import { AlertType } from '../constants'
import getLatestActionType from '../util/getLastActionType'
import { alertActionCreator as alert } from './alert'

/** Action-creator for undo. */
export const undoActionCreator = (): Thunk => (dispatch, getState) => {
  const lastActionType = getLatestActionType(getState().undoPatches)

  dispatch({ type: 'undo' })

  if (!lastActionType) return

  dispatch(
    alert(`Undo: ${startCase(lastActionType)}`, {
      clearDelay: 3000,
      showCloseLink: false,
      alertType: AlertType.Undo,
    }),
  )
}
