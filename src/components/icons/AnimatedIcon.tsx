import { useState } from 'react'
import { css, cx } from '../../../styled-system/css'
import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import AnimatedIconType from '../../@types/AnimatedIconType'
import { ICON_SCALING_FACTOR } from '../../constants'
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
  const newSize = size * ICON_SCALING_FACTOR
  const color = style.fill || fill || token('colors.fg')

  const [animationKey, setAnimationKey] = useState(0)

  /** Handles click event to restart animation (without updating opacity). */
  const handleClick = () => {
    setAnimationKey(prev => prev + 1) 
  }

  return (
    <div
      className={cx(icon(), css(cssRaw))}
      style={{
        ...style,
        width: `${newSize}px`,
        height: `${newSize}px`,
        color,
        display: 'inline-flex',
      }}
      onClick={handleClick}
    >
      {animated && animationKey % 2 === 0 ? (
        <LottieAnimation
          key={animationKey} 
          animationData={animationData}
          onComplete={animationComplete}
        />
      ) : (
        children
      )}
    </div>
  )
}

export default AnimatedIcon