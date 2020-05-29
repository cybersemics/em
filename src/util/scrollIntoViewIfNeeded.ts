import { isElementInViewport } from './isElementInViewport'

/** Replace deprecated built-in. */
export const scrollIntoViewIfNeeded = (el: HTMLElement, options: ScrollIntoViewOptions = {}) => {
  if (!isElementInViewport(el)) {
    el.scrollIntoView(options)
  }
}
