import React from 'react'
import { ActivityIndicator, StyleProp, ViewStyle } from 'react-native'
import { Text } from './Text.native'
import tw from 'tailwind-react-native-classnames'
import styled from 'styled-components/native'
import themeSpecific from '../styled-helpers/themeSpecific'

const Button = styled.TouchableOpacity`
  ${tw`p-2 my-4 items-center rounded-lg w-6/12` as Record<string, string>}
  ${themeSpecific({
    dark: tw`bg-white`,
    light: tw`bg-black`,
  })}
`

interface ActionButtonProps {
  title: string
  active?: boolean
  inActive?: boolean
  small?: boolean
  isLoading?: boolean
  disabled?: boolean
  onClick: () => void
  style?: StyleProp<ViewStyle>
}

/**
 * Action Button.
 */
export const ActionButton = ({
  title,
  active,
  inActive,
  small,
  isLoading,
  disabled,
  onClick,
  style = {},
  ...restProps
}: ActionButtonProps) => (
  <Button onPress={!disabled ? onClick : undefined} style={style}>
    {isLoading ? (
      <ActivityIndicator size={35} />
    ) : (
      <Text alternate={true} style={tw`text-xs`}>
        {title}
      </Text>
    )}
  </Button>
)
