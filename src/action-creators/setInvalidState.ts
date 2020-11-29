import { Thunk } from '../types'

/** Real-time meta validation error. It is dispatched by Editable handlers and is used by Bullet and ThoughtsAnnotation to make visual changes. */
const setInvalidState = (value: boolean): Thunk => (dispatch, getState) =>
  getState().invalidState !== value
    ? dispatch({ type: 'invalidState', value })
    : null

export default setInvalidState
