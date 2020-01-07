export const showOverlay = (state, { id }) => ({
  toolbarOverlay: {
    showOverlay: true,
    shortcutId: id
  }
})
export const updateOverlay = (state, { id }) => {
  const {
    toolbarOverlay: { showOverlay }
  } = state
  return {
    toolbarOverlay: {
      showOverlay,
      shortcutId: id
    }
  }
}
export const hideOverlay = () => ({
  toolbarOverlay: {
    showOverlay: false,
    shortcutId: null
  }
})
