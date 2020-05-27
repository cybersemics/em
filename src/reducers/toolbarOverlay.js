/** Sets the toolbar overlay id. */
export const setToolbarOverlay = (state, { id }) => ({
  ...state,
  toolbarOverlay: id
})

/** Sets scrollPrioritized. */
export const prioritizeScroll = (state, { val }) => ({
  ...state,
  scrollPrioritized: val
})
