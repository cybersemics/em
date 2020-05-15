//@ts-nocheck

/** Adds commas to a number. */
// TODO: Localize
export const formatNumber = n => {
  let s = '' // eslint-disable-line fp/no-let
  const digits = n.toString().split('')
  digits.forEach((value, i) => {
    s = digits[digits.length - 1 - i] + s
    if (i % 3 === 2 && i < digits.length - 1) {
      s = ',' + s
    }
  })
  return s
}
