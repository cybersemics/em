import { TextStyle } from 'react-native'

/** Adjust font size -> helper function to manage text resize. */
export const adjustFontSize = (baseFontSize: number, style: TextStyle, originalFontSize = 16) => {
  const mergedStyle = Array.isArray(style)
    ? style.reduce(
        (acc, item) => ({
          ...acc,
          ...item,
        }),
        {},
      )
    : style
  const currentFontSize = mergedStyle.fontSize || originalFontSize

  // Factor should be cakculated by the difference between current base font size and original base font size.
  const factor = Math.abs(baseFontSize - originalFontSize)

  return { ...mergedStyle, fontSize: currentFontSize + factor }
}
