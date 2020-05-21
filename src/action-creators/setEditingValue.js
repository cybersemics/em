/** Tracks the real-time editing value. */
export default value => (dispatch, getState) =>
  getState().editingValue !== value
    ? dispatch({ type: 'editingValue', value })
    : null
