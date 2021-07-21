import React, { FC } from 'react'
import { Text as RNText, TextStyle } from 'react-native'
import { useSelector } from 'react-redux'
import { State } from '../@types'
import { adjustFontSize } from '../util/adjustFontSize'

/** Custom text component. */
export const Text: FC<React.ComponentProps<typeof RNText>> = ({ style = {}, ...props }) => {
  const fontSize = useSelector((state: State) => state.fontSize)

  return <RNText {...props} style={adjustFontSize(fontSize, style as TextStyle)} />
}
