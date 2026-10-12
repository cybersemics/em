import { PropsWithChildren } from 'react'
import { useSelector } from 'react-redux'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/IconType'
import LottieData from '../../@types/lottie/LottieData'
import { ICON_SCALING_FACTOR } from '../../constants'
import themeColors from '../../selectors/themeColors'
import iconClassName from '../../util/iconClassName'
import rgbToHex from '../../util/rgbToHex'
import LottieAnimation from './LottieAnimation'

interface AnimatedIconType extends IconType, PropsWithChildren {
  /** Animation data for Lottie. */
  animationData?: LottieData | null
}

/** Animated Icon with Conditional Lottie Animation. */
const AnimatedIcon = ({
  fill,
  size = 18,
  style = {},
  className,
  animated,
  animationData,
  children,
  animationComplete,
}: AnimatedIconType) => {
  const colors = useSelector(themeColors)
  const newSize = size * ICON_SCALING_FACTOR
  const color = style.fill || fill || token('colors.fg')
  const dynamicColor = rgbToHex(colors.fg)

  return (
    <div
      className={iconClassName(className)}
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
