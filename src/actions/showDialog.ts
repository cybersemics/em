import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'

/** Shows or hides a dialog. */
const showDialog = (state: State, { id }: { id: string }) => ({
  ...state,
  dialogOpen: id,
})

/** Display a given dialog and perform any additional setup. */
export const showDialogActionCreator =
  (payload: { id: string }): Thunk =>
  dispatch => {
    dispatch({ type: 'showDialog', ...payload })
    // Additional setup can be done here if needed
  }

export default _.curryRight(showDialog)
