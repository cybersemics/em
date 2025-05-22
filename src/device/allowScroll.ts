/** Disables scrolling on the body element with overflow:hidden. */
const disableScroll = () => {
  document.body.style.overflow = 'hidden'
}

/** Re-enables scrolling on the body element by removing overflow:hidden. */
const enableScroll = () => {
  document.body.style.overflow = ''
}

/** Enables or disables scrolling based on the parameter. */
function allowScroll(allow: boolean) {
  if (allow) enableScroll()
  else disableScroll()
}

export default allowScroll
