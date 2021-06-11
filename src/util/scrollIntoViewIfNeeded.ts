import { getScrollableContainer } from './getScrollableContainer'
import { isElementInViewport } from './isElementInViewport'

/** Scrolls the given element to the top 1/3 of the screen. */
export const scrollIntoViewIfNeeded = (el: HTMLElement) => {
  if (el && !isElementInViewport(el)) {
    const scrollableContainer = getScrollableContainer()
    // The native el.scrollIntoView causes a bug where the top part of the content is cut off, even when a significant delay is added.
    const elDocumentY = scrollableContainer.scrollTop + el.getBoundingClientRect().y
    scrollableContainer.scrollTo(0, elDocumentY - scrollableContainer.scrollHeight * 1 / 3)
  }
}
