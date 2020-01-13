export default (state, { value }) => {
  return { showSidebar: value == null ? !state.showSidebar : value }
}
