//@ts-nocheck

/** Returns true if the given element is visibly within the viewport. */
export const isElementInViewport = el => {
  const rect = el.getBoundingClientRect()
  return rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
}
