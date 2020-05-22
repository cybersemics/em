export default (state, { value, activeViewID }) => {
  return { showSplitView: value == null ? state.showSplitView : value, activeView: activeViewID || 'main' }
}
