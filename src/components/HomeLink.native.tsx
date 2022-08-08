import React from 'react'
import { StyleSheet, TouchableOpacity } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { useSelector } from 'react-redux'
import themeColors from '../selectors/themeColors'

interface HomeLinkProps {
  color?: string
  showModal?: string | null
  size?: number
  style?: React.CSSProperties
}

/** A link to the home screen. */
const HomeLink = ({ color, showModal, size = 60, style }: HomeLinkProps) => {
  const colors = useSelector(themeColors)
  return (
    <TouchableOpacity style={styles.container}>
      <Svg width={size || 35} height={size || 35} viewBox='0 0 35 35' fill={color || colors.fg}>
        <Path d='M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z' />
        <Path d='M0 0h24v24H0z' fill='none' />
      </Svg>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: { marginTop: 15 },
})

export default HomeLink
