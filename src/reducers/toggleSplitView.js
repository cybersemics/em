/** Toggles the Split View. */
export default (state, { value }) => ({
  ...state,
  showSplitView: value == null ? !state.showSplitView : value
})
