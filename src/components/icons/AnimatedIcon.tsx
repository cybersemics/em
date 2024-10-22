import { useEffect, useState } from 'react'
import { css, cx } from '../../../styled-system/css'
import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import { AnimatedIconType } from '../../@types/Icon'
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

  // Local state to manage animation status
  const [isAnimated, setIsAnimated] = useState(animated)

  useEffect(() => {
    setIsAnimated(animated)
  }, [animated])

  /** Calls the animationComplete callback if provided. */
  const handleAnimationComplete = () => {
    if (animationComplete) {
      animationComplete()
    }
  }

  return (
    <div className={cx(icon(), css(cssRaw))} style={{ width: `${newSize}px`, height: `${newSize}px`, color }}>
      {isAnimated ? <LottieAnimation animationData={animationData} onComplete={handleAnimationComplete} /> : children}
    </div>
  )
}

export default AnimatedIcon
