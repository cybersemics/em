let scrollY = 0

/** Disables scrolling on the html and body elements with overflow:hidden, and offsets the content by the value of window.scrollY. */
const disableScroll = () => {
  scrollY = window.scrollY
  document.documentElement.style.setProperty('--scroll-offset', `-${scrollY}px`)
  document.documentElement.setAttribute('data-dialog-open', 'true')
}

/** Re-enables scrolling on the body element by removing overflow:hidden and restoring the scroll position. */
const enableScroll = () => {
  document.documentElement.style.removeProperty('--scroll-offset')
  document.documentElement.removeAttribute('data-dialog-open')
  queueMicrotask(() => window.scrollTo(0, scrollY))
}

/** Enables or disables scrolling based on the parameter.
 * When using allowScroll, be mindful that any call to enableScroll will enable scroll globally.
 * If there are multiple consumers that have disabled scrolling, conflicts may occur between them.
 */
function allowScroll(allow: boolean) {
  if (allow) enableScroll()
  else disableScroll()
}

export default allowScroll
