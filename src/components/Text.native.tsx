import React, { FC } from 'react'
import { Text as RNText, TextStyle } from 'react-native'
import { useSelector } from 'react-redux'
import { State } from '../@types'
import { adjustFontSize } from '../util/adjustFontSize'
import styled from 'styled-components/native'
import themeSpecific from '../styled-helpers/themeSpecific'
import tw from 'tailwind-react-native-classnames'

const StyledRNText = styled.Text<{ alternate?: boolean }>`
  ${props =>
    themeSpecific({
      light: props.alternate ? tw`text-white` : tw`text-black`,
      dark: props.alternate ? tw`text-black` : tw`text-white`,
      // TODO: Override global styled theme with proper type
    })(props as any)}
`

/** Custom text component. */
export const Text: FC<React.ComponentProps<typeof RNText> & { alternate?: boolean }> = ({ style = {}, ...props }) => {
  const fontSize = useSelector((state: State) => state.fontSize)
  return <StyledRNText {...props} style={adjustFontSize(fontSize, style as TextStyle)} />
}
