import React from 'react'
import { ActivityIndicator, StyleProp, TouchableOpacity, ViewStyle, Text, StyleSheet } from 'react-native'

interface ActionButtonProps {
  title: string
  active?: boolean
  inActive?: boolean
  small?: boolean
  isLoading?: boolean
  isDisabled?: boolean
  onPress: () => void
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
  onPress,
  style = {},
  ...restProps
}: ActionButtonProps) => (
  <TouchableOpacity onPress={!isDisabled ? onPress : undefined} style={[styles.defaultStyle, style]}>
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
    width: '40%',
  },
  title: { fontSize: 18 },
})
