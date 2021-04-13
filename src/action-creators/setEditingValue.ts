import { Thunk } from '../types'

/** Tracks the real-time editing value. */
const setEditingValue = (value: string | null): Thunk => (dispatch, getState) => {
  if (getState().editingValue !== value) {
    dispatch({ type: 'editingValue', value })
  }
}

export default setEditingValue
