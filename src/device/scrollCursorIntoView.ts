import { isSafari, isTouch } from '../browser'

/** Returns true if the given element is visible within the vertical viewport. */
const isElementInViewport = (el: HTMLElement) => {
  const rect = el.getBoundingClientRect()
  return rect.top >= 0 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight)
}

/** Scrolls the given element to the top 1/3 of the screen. */
const scrollIntoViewIfNeeded = (el: HTMLElement) => {
  if (el && !isElementInViewport(el)) {
    // The native el.scrollIntoView causes a bug where the top part of the content is cut off, even when a significant delay is added.
    // Therefore, we need to calculate the scroll position ourselves
    const elDocumentY = window.scrollY + el.getBoundingClientRect().y
    const scrollY = elDocumentY - window.innerHeight / 3

    // scroll to 1 instead of 0
    // otherwise Mobile Safari scrolls to the top after MultiGesture
    // See: touchmove in MultiGesture.tsx
    window.scrollTo(0, Math.max(1, scrollY))
  }
}

/** Scrolls the cursor into view if needed. */
const scrollCursorIntoView = (delay?: number) => {
  // web only
  // TODO: Implement on React Native
  if (typeof window === 'undefined' || typeof document === 'undefined' || !document.querySelector) return

  // bump scroll on Mobile Safari
  // otherwise Safari scrolls to the top after MultiGesture
  // See: touchmove in MultiGesture.tsx
  if (isTouch && isSafari()) {
    window.scrollBy(0, 1)
  }

  setTimeout(() => {
    const cursorEl = document.querySelector('.editing') as HTMLElement | null
    if (cursorEl) {
      scrollIntoViewIfNeeded(cursorEl)
    }
  }, delay)
}

export default scrollCursorIntoView
