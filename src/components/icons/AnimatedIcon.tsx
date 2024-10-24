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
  const [opacity, setOpacity] = useState(1) // Local state for opacity

  /** Handles click event to restart animation and update opacity. */
  const handleClick = () => {
    setOpacity(0.2)
    setAnimationKey(prev => prev + 1) // Increment key to force remount

    // Restore opacity after delay
    setTimeout(() => {
      setOpacity(1)
    }, 100)
  }

  return (
    <div
      className={cx(icon(), css(cssRaw))}
      style={{
        ...style,
        width: `${newSize}px`,
        height: `${newSize}px`,
        color,
      }}
      onClick={handleClick}
    >
      {animated ? (
        <LottieAnimation
          key={animationKey} // Force re-render of animation on key change
          animationData={animationData}
          onComplete={animationComplete}
          style={{ opacity, transition: 'opacity 0.4s ease-in-out' }}
        />
      ) : (
        children
      )}
    </div>
  )
}

export default AnimatedIcon
