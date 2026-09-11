/* eslint-disable import/prefer-default-export */
import { startCase } from 'lodash'
import Thunk from '../@types/Thunk'
import { AlertType } from '../constants'
import getLatestActionType from '../util/getLastActionType'
import { alertActionCreator as alert } from './alert'

/** Action-creator for redo.
 *
 * @param cursorAtEnd  Place the caret at the end of the restored thought instead of restoring the cursor offset captured before the redone action. Used by native redo (iOS three-finger swipe / shake-to-undo), which is expected to leave the caret at the end of the restored word.
 * @param count  The exact number of patches to restore instead of one step. Used by the undo slider to move through the history by whole steps (see selectors/undoSteps).
 */
export const redoActionCreator =
  ({ cursorAtEnd, count }: { cursorAtEnd?: boolean; count?: number } = {}): Thunk =>
  (dispatch, getState) => {
    const lastActionType = getLatestActionType(getState().redoPatches)

    dispatch({ type: 'redo', cursorAtEnd, count })

    if (!lastActionType) return

    dispatch(
      alert(`Redo: ${startCase(lastActionType)}`, {
        alertType: AlertType.Redo,
      }),
    )
  }
