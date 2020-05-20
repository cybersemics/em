/** Toggles the Split View. */
export default (state, { value }) => {
  return { showSplitView: value == null ? !state.showSplitView : value }
}
