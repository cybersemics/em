import { Thunk } from '../types'

/** Tracks the real-time editing value. */
const setEditingValue = (value: string | null): Thunk => (dispatch, getState) =>
  getState().editingValue !== value
    ? dispatch({ type: 'editingValue', value })
    : null

export default setEditingValue
