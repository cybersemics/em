/** Gets the padding of an element as an array of numbers. */
const getElementPaddings = (element: HTMLElement): number[] =>
  window.getComputedStyle(element, null).getPropertyValue('padding').split('px ').map(Number)

export default getElementPaddings
