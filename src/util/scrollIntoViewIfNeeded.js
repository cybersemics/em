import { isElementInViewport } from './isElementInViewport.js'

/** Replace deprecated built-in */
export const scrollIntoViewIfNeeded = (el, options) => {
  if (!isElementInViewport(el)) {
    el.scrollIntoView(options)
  }
}
