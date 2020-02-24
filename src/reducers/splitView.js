
export const updateSplitPosition = (state, { value }) => {
  localStorage.setItem('splitPosition', parseInt(value, 10))
  return { ...state, splitPosition: value }
}

export const toggleSplitView = (state, { value }) => {
  return { showSplitView: value == null ? !state.showSplitView : value }
}
