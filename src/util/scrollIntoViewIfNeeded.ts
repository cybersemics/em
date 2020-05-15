//@ts-nocheck
import { isElementInViewport } from './isElementInViewport'

/** Replace deprecated built-in. */
export const scrollIntoViewIfNeeded = (el, options) => {
  if (!isElementInViewport(el)) {
    el.scrollIntoView(options)
  }
}
