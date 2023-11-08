/** Disables scrolling on the body element with overflow:hidden. */
export const disableScroll = () => {
  document.body.style.overflow = 'hidden'
}

/** Re-enables scrolling on the body element by removing overflow:hidden. */
export const enableScroll = () => {
  document.body.style.overflow = ''
}
