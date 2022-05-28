import { Thunk } from '../@types'
import { hashThought, timestamp } from '../util'
import { deleteLexeme, updateLastUpdated } from '../data-providers/dexie'

/** Low-level action to delete a lexeme directly from State and Dexie. Use deleteThought instead if possible. */
const deleteData =
  (value: string): Thunk =>
  (dispatch, getState) => {
    deleteLexeme(hashThought(value))
    updateLastUpdated(timestamp())
    dispatch({ type: 'deleteData', value })
  }

export default deleteData
