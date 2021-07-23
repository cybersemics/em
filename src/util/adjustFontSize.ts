import { TextStyle } from 'react-native'

/** Adjust font size -> helper function to manage text resize. */
export const adjustFontSize = (factor: number, style: TextStyle, originalFontSize = 6) => {
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

  return { ...mergedStyle, fontSize: currentFontSize + factor }
}
