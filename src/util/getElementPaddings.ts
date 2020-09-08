/** Gets the padding of an element as an array of numbers. */
export const getElementPaddings = (element: HTMLElement): number[] =>
  window
    .getComputedStyle(element, null)
    .getPropertyValue('padding')
    .replace(/\s/g, '')
    .split('px')
    .map(Number)
