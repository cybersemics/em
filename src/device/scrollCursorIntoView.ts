import { isSafari, isTouch } from '../browser'
import { PREVENT_AUTOSCROLL_TIMEOUT, isPreventAutoscrollInProgress } from '../device/preventAutoscroll'
import viewportStore from '../stores/viewport'

/** Scrolls the minimum amount necessary to move the viewport so that it includes the element. */
const scrollIntoViewIfNeeded = (y: number, height: number) => {
  // preventAutoscroll works by briefly increasing the element's height, which breaks isElementInViewport.
  // Therefore, we need to wait until preventAutoscroll is done.
  // See: preventAutoscroll.ts
  if (isPreventAutoscrollInProgress()) {
    setTimeout(() => {
      scrollIntoViewIfNeeded(y, height)
    }, PREVENT_AUTOSCROLL_TIMEOUT)
    return
  }

  // determine if the elements is above or below the viewport
  // toolbar element is not present when distractionFreeTyping is activated
  const toolbarRect = document.getElementById('toolbar')?.getBoundingClientRect()
  const toolbarBottom = toolbarRect ? toolbarRect.bottom : 0
  const navbarRect = document.querySelector('[aria-label="nav"]')?.getBoundingClientRect()
  const viewport = viewportStore.getState()
  const isAboveViewport = y + viewport.layoutTreeTop - window.scrollY < toolbarBottom
  const isBelowViewport =
    y + height + viewport.layoutTreeTop - window.scrollY >
    viewport.innerHeight - viewport.virtualKeyboardHeight - (navbarRect?.height ?? 0)

  if (!isAboveViewport && !isBelowViewport) return

  // The native el.scrollIntoView causes a bug where the top part of the content is cut off, even when a significant delay is added.
  // Therefore, we need to calculate the scroll position ourselves

  /** The y position of the element relative to the document. */
  const yOffset = viewport.layoutTreeTop + y

  // leave a margin between the element and the viewport edge equal to half the element's height
  // add offset to account for the navbar height and prevent scrolled to elements from being hidden below
  const scrollYNew = isAboveViewport
    ? yOffset - (toolbarRect?.height ?? 0) - height / 2
    : yOffset - viewport.innerHeight + viewport.virtualKeyboardHeight + height * 1.5 + (navbarRect?.height ?? 0)

  // scroll to 1 instead of 0
  // otherwise Mobile Safari scrolls to the top after MultiGesture
  // See: touchmove in MultiGesture.tsx
  const top = Math.max(1, scrollYNew)

  const scrollDistance = Math.abs(scrollYNew - window.scrollY)
  const viewportHeight = viewport.innerHeight
  const behavior = scrollDistance < viewportHeight ? 'smooth' : 'auto'

  window.scrollTo({
    top,
    behavior,
  })
}

/** Scrolls the cursor into view if needed. */
const scrollCursorIntoView = (y: number, height: number) => {
  // bump scroll on Mobile Safari
  // otherwise Safari scrolls to the top after MultiGesture
  // See: touchmove in MultiGesture.tsx
  if (window.scrollY === 0 && isTouch && isSafari()) {
    window.scrollBy(0, 1)
  }

  scrollIntoViewIfNeeded(y, height)
}

export default scrollCursorIntoView
