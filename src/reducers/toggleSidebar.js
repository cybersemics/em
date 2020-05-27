/** Toggles the sidebar. */
export default (state, { value }) => ({
  ...state,
  showSidebar: value == null ? !state.showSidebar : value,
})
