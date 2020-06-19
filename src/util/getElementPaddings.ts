/** Gets the padding of an element as an array of numbers. */
export const getElementPaddings = element => {
  return window
    .getComputedStyle(element, null)
    .getPropertyValue('padding')
    .split('px ')
    .map(Number)
}
