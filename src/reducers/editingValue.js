/** Sets the value that is being edited (unthrottled). */
export default (state, { value }) => ({
  ...state,
  editingValue: value
})
