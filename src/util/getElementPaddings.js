export const getElementPaddings = element => {
  return window
    .getComputedStyle(element, null)
    .getPropertyValue('padding')
    .split('px ')
    .map(Number)
}
