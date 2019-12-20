export const isElementHiddenByAutoFocus = el => {
  const children = el.closest('.children')
  return (children.classList.contains('distance-from-cursor-2') && !el.closest('.cursor-parent')) ||
    children.classList.contains('distance-from-cursor-3')
}
