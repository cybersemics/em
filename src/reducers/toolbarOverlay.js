export const showOverlay = (state, { id }) => ({
  toolbarOverlay: {
    shortcutId: id
  }
})
export const hideOverlay = () => ({
  toolbarOverlay: {
    showOverlay: false,
    shortcutId: null
  }
})
