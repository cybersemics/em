/** Toggles the splitview. */
export default (state, { value, activeViewID }) => {
  console.log('value', value)
  localStorage.setItem('showSplitView', value === null ? state.showSplitView : value)
  return { showSplitView: value == null ? state.showSplitView : value, activeView: activeViewID || 'main' }
}
