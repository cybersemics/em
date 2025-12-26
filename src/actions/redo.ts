/* eslint-disable import/prefer-default-export */
import { startCase } from 'lodash'
import Thunk from '../@types/Thunk'
import { AlertType } from '../constants'
import getLatestActionType from '../util/getLastActionType'
import { alertActionCreator as alert } from './alert'

/** Action-creator for redo. */
export const redoActionCreator = (): Thunk => (dispatch, getState) => {
  const lastActionType = getLatestActionType(getState().redoPatches)

  dispatch({ type: 'redo' })

  if (!lastActionType) return

  dispatch(
    alert(`Redo: ${startCase(lastActionType)}`, {
      showCloseLink: false,
      alertType: AlertType.Redo,
    }),
  )
}
