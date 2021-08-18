import React from 'react'
import { ActivityIndicator, StyleProp, TouchableOpacity, ViewStyle, StyleSheet } from 'react-native'
import { Text } from './Text.native'

interface ActionButtonProps {
  title: string
  active?: boolean
  inActive?: boolean
  small?: boolean
  isLoading?: boolean
  isDisabled?: boolean
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
  isDisabled,
  onClick,
  style = {},
  ...restProps
}: ActionButtonProps) => (
  <TouchableOpacity onPress={!isDisabled ? onClick : undefined} style={[styles.defaultStyle, style]}>
    {isLoading ? <ActivityIndicator size={35} /> : <Text style={styles.title}>{title}</Text>}
  </TouchableOpacity>
)

const styles = StyleSheet.create({
  defaultStyle: {
    backgroundColor: 'white',
    padding: 10,
    alignItems: 'center',
    borderRadius: 20,
    marginVertical: 10,
    width: '50%',
  },
  title: { fontSize: 2, color: '#000' },
})
