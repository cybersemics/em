/** Returns true if the element has been hidden by the distance-from-cursor autofocus. */
export const isElementHiddenByAutoFocus = (el: HTMLElement) => {
  const children = el.closest('.children')
  return children ? (children.classList.contains('distance-from-cursor-2') && !el.closest('.cursor-parent')) ||
    children.classList.contains('distance-from-cursor-3') : false
}
