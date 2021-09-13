import { Thunk } from '../@types'
import scrollTo from '../device/scrollTo'

/** Display a given modal dialog box and scroll to the top. */
const showModal =
  (payload: { id: string }): Thunk =>
  (dispatch, getState) => {
    dispatch({ type: 'showModal', ...payload })
    scrollTo('top')
  }

export default showModal
