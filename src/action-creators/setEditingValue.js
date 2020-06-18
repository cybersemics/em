/**
 * @packageDocumentation
 */

/** Tracks the real-time editing value. */
const setEditingValue = value => (dispatch, getState) =>
  getState().editingValue !== value
    ? dispatch({ type: 'editingValue', value })
    : null

export default setEditingValue
