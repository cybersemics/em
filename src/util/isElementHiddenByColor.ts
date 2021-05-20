/** Get alpha value of given color. */
const getAlphaValue = (color: string) => {
  if (color.startsWith('rgba')) {
    const alpha = color.replace(/^.*,(.+)\)/, '$1')
    return parseFloat(alpha)
  }
  return 1
}

/** Returns true if the element has been hidden by alpha value of thecolor. */
export const isElementHiddenByColor = (el: HTMLElement) => {
  const color = window.getComputedStyle(el, null).color
  return getAlphaValue(color) === 0
}
