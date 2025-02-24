import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'

/**
 * Closes the dialog.
 */
const closeDialog = (state: State) => {
  return {
    ...state,
    dialogOpen: false,
  }
}

/** Action-creator for closeDialog. */
export const closeDialogActionCreator = (): Thunk => dispatch => {
  dispatch({ type: 'closeDialog' })
}

export default _.curryRight(closeDialog)
