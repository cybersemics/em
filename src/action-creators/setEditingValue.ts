import { ActionCreator } from '../types'

/** Tracks the real-time editing value. */
const setEditingValue = (value: string | null): ActionCreator => (dispatch, getState) =>
  getState().editingValue !== value
    ? dispatch({ type: 'editingValue', value })
    : null

export default setEditingValue
