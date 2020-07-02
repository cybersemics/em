/** Toggles the splitview. */
export default (state, { value, activeViewID }) => {
  localStorage.setItem('showSplitView', value === null ? state.showSplitView : value)
  return { showSplitView: value == null ? state.showSplitView : value, activeView: activeViewID || 'main' }
}
