import Thunk from '../@types/Thunk'
import { deleteLexeme } from '../data-providers/yjs/thoughtspace'
import hashThought from '../util/hashThought'

/** Low-level action to delete a lexeme directly from local and remote. Use deleteThought instead if possible. */
const deleteData =
  (value: string): Thunk =>
  (dispatch, getState) => {
    deleteLexeme(hashThought(value))
    dispatch({ type: 'deleteData', value })
  }

export default deleteData
