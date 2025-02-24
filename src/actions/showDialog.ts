import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'

/**
 * Opens the dialog.
 */
const showDialog = (state: State) => {
  return {
    ...state,
    dialogOpen: true,
  }
}

/** Display a given dialog. */
export const showDialogActionCreator = (): Thunk => (dispatch, getState) => {
  dispatch({ type: 'showDialog' })
}

export default _.curryRight(showDialog)
