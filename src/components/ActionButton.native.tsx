import React from 'react'
import { ActivityIndicator, StyleProp, ViewStyle } from 'react-native'
import { Text } from './Text.native'
import tw from 'twrnc'
import { TouchableOpacity } from 'react-native-gesture-handler'

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
  <TouchableOpacity
    onPress={!disabled ? onClick : undefined}
    style={[tw`p-2 my-4 items-center rounded-lg w-6/12 bg-black dark:bg-white`, style]}
  >
    {isLoading ? (
      <ActivityIndicator size={35} />
    ) : (
      <Text alternate={true} style={tw`text-xs`}>
        {title}
      </Text>
    )}
  </TouchableOpacity>
)
