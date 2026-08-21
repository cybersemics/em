/* eslint-disable import/prefer-default-export */
import { startCase } from 'lodash'
import Thunk from '../@types/Thunk'
import { AlertType } from '../constants'
import getLatestActionType from '../util/getLastActionType'
import { alertActionCreator as alert } from './alert'

/** Action-creator for redo.
 *
 * @param cursorAtEnd  Place the caret at the end of the restored thought instead of restoring the cursor offset captured before the redone action. Used by native redo (iOS three-finger swipe / shake-to-undo), which is expected to leave the caret at the end of the restored word.
 */
export const redoActionCreator =
  ({ cursorAtEnd }: { cursorAtEnd?: boolean } = {}): Thunk =>
  (dispatch, getState) => {
    const lastActionType = getLatestActionType(getState().redoPatches)

    dispatch({ type: 'redo', cursorAtEnd })

    if (!lastActionType) return

    dispatch(
      alert(`Redo: ${startCase(lastActionType)}`, {
        alertType: AlertType.Redo,
      }),
    )
  }
