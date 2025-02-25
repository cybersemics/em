import { Thunk } from '../@types/Thunk'
import { showDialogActionCreator } from './showDialog'

/** Action-creator for openGestureCheatsheet. */
export const openGestureCheatsheetActionCreator = (): Thunk => dispatch => {
  dispatch(showDialogActionCreator())
}

export default openGestureCheatsheetActionCreator
