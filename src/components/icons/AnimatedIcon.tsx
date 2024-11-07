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
    >
      {animated ? <LottieAnimation animationData={animationData} onComplete={animationComplete} /> : children}
    </div>
  )
}

export default AnimatedIcon
