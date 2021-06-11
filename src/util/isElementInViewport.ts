/** Returns true if the given element is visible within the vertical viewport. */
export const isElementInViewport = (el: HTMLElement) => {
  const rect = el.getBoundingClientRect()
  const approxToolbarHeight = 25
  return (rect.top - approxToolbarHeight) >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight)
}
