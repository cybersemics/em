import Modal from '../@types/Modal'
import Thunk from '../@types/Thunk'
import scrollTo from '../device/scrollTo'

/** Display a given modal dialog box and scroll to the top. */
const showModal =
  (payload: { id: Modal }): Thunk =>
  (dispatch, getState) => {
    dispatch({ type: 'showModal', ...payload })
    // wait till next tick, otherwise modal may not be rendered yet
    setTimeout(() => {
      scrollTo('top')
    })
  }

export default showModal
