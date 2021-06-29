import { Thunk } from '../types'
import { storage } from '../util/localStorage'

/** Closes a modal permanently. */
const modalComplete =
  (id: string): Thunk =>
  dispatch => {
    storage.setItem('modal-complete-' + id, 'true')
    dispatch({ type: 'modalComplete', id })
  }

export default modalComplete
