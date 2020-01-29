export const showOverlay = (state, { id }) => ({
  toolbarOverlay: id
})
export const hideOverlay = () => ({
  toolbarOverlay: null
})
export const prioritizeScroll = (state, { val }) => ({
  scrollPrioritized: val
})
