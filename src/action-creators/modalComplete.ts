import Thunk from '../@types/Thunk'
import storage from '../util/storage'

/** Closes a modal permanently. */
const modalComplete =
  (id: string): Thunk =>
  dispatch => {
    storage.setItem('modal-complete-' + id, 'true')
    dispatch({ type: 'modalComplete', id })
  }

export default modalComplete
