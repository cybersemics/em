import { isElementInViewport } from './isElementInViewport'

/** Scrolls the given element to the top 1/3 of the screen. */
export const scrollIntoViewIfNeeded = (el: HTMLElement) => {
  if (el && !isElementInViewport(el)) {
    // The native el.scrollIntoView causes a bug where the top part of the content is cut off, even when a significant delay is added.
    const elDocumentY = window.scrollY + el.getBoundingClientRect().y
    window.scrollTo(0, elDocumentY - window.innerHeight * 1 / 3)
  }
}
