let scrollY = 0

/** Disables scrolling on the html and body elements with overflow:hidden, and offsets the content by the value of window.scrollY. */
const disableScroll = () => {
  const scrollContentPane = document.querySelector('#root > :first-child') as HTMLElement

  scrollY = window.scrollY
  document.documentElement.style.overflow = 'hidden'
  document.body.style.overflow = 'hidden'
  scrollContentPane.style.marginTop = `-${scrollY}px`
}

/** Re-enables scrolling on the body element by removing overflow:hidden and restoring the scroll position. */
const enableScroll = () => {
  const scrollContentPane = document.querySelector('#root > :first-child') as HTMLElement

  document.documentElement.style.overflow = ''
  document.body.style.overflow = ''
  scrollContentPane.style.marginTop = ''
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
