import React, { FC } from 'react'
import { Text as RNText, TextStyle } from 'react-native'
import { useSelector } from 'react-redux'
import { State } from '../util/initialState'

/** Custom text component. */
export const Text: FC<React.ComponentProps<typeof RNText>> = ({ style = {}, ...props }) => {
  const fontSize = useSelector((state: State) => state.fontSize)

  /** Adjust font size -> helper function to manage text resize. */
  const adjustFontSize = (factor: number, style: TextStyle, originalFontSize = 6) => {
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

  return <RNText {...props} style={adjustFontSize(fontSize, style as TextStyle)} />
}
