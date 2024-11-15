import { rgbToHex } from '@mui/material'
import { useRef } from 'react'
import { useSelector } from 'react-redux'
import { css, cx } from '../../../styled-system/css'
import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import AnimatedIconType from '../../@types/AnimatedIconType'
import { ICON_SCALING_FACTOR } from '../../constants'
import theme from '../../selectors/theme'
import LottieAnimation from './LottieAnimation'

/** Animated Icon with Conditional Lottie Animation. */
const AnimatedIcon = ({
  fill,
  size = 18,
  style = {},
  cssRaw,
  animated,
  animationData,
  children,
  animationComplete,
}: AnimatedIconType) => {
  const isLightTheme = useSelector(state => theme(state) === 'Light')
  const lottieColor = isLightTheme ? '#000000' : '#FFFFFF'
  const newSize = size * ICON_SCALING_FACTOR
  const color = style.fill || fill || token('colors.fg')

  // Create a ref to the parent div
  const divRef = useRef<HTMLDivElement | null>(null)

  // Calculate dynamic color directly
  const computedStyle = divRef.current ? getComputedStyle(divRef.current) : null
  const dynamicColor = computedStyle?.color ? rgbToHex(computedStyle.color) : lottieColor

  return (
    <div
      ref={divRef}
      className={cx(icon(), css(cssRaw))}
      style={{
        ...style,
        width: `${newSize}px`,
        height: `${newSize}px`,
        color,
        display: 'inline-flex',
      }}
    >
      {animated ? (
        <LottieAnimation animationData={animationData || null} onComplete={animationComplete} color={dynamicColor} />
      ) : (
        children
      )}
    </div>
  )
}

export default AnimatedIcon
