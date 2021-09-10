/** Returns true if the given element is visible within the vertical viewport. */
const isElementInViewport = (el: HTMLElement) => {
  const rect = el.getBoundingClientRect()
  return rect.top >= 0 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight)
}

/** Scrolls the given element to the top 1/3 of the screen. */
const scrollIntoViewIfNeeded = (el: HTMLElement) => {
  if (el && !isElementInViewport(el)) {
    // The native el.scrollIntoView causes a bug where the top part of the content is cut off, even when a significant delay is added.
    const elDocumentY = window.scrollY + el.getBoundingClientRect().y
    window.scrollTo(0, elDocumentY - (window.innerHeight * 1) / 3)
  }
}

/** Scrolls the cursor into view if needed. If there is no cursor, scroll to top. Web only. */
const scrollCursorIntoView = (delay?: number) => {
  // web only
  // TODO: Implement on React Native
  if (typeof window === 'undefined' || typeof document === 'undefined' || !document.querySelector) return

  setTimeout(() => {
    const cursorEl = document.querySelector('.editing') as HTMLElement | null
    if (!cursorEl) {
      window.scrollTo(0, 0)
    } else if (cursorEl) {
      scrollIntoViewIfNeeded(cursorEl)
    }
  }, delay)
}

export default scrollCursorIntoView
