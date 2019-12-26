export const toggleSidebar = (state,{ value })=> {
  return { showSidebar: value == null ? !state.showSidebar: value }
}
