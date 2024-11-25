import Player, { LottieRefCurrentProps } from 'lottie-react'
import React, { useEffect, useRef } from 'react'

interface LottieAnimationProps {
  animationData: any
  speed?: number
  onComplete?: () => void
  style?: React.CSSProperties
}

/**
 * LottieAnimation Component.
 *
 * This component renders a Lottie animation using the `lottie-react` Player.
 * It accepts animation data and an optional speed prop to control the animation speed.
 *
 */
const LottieAnimation: React.FC<LottieAnimationProps> = ({
  animationData,
  speed = 1, // Default speed set to 1x
  onComplete,
  style,
}) => {
  const lottieRef = useRef<LottieRefCurrentProps | null>(null)

  useEffect(() => {
    if (lottieRef.current) {
      // skip the animation in Puppeteer tests to avoid inconsistent snapshots
      lottieRef.current.setSpeed(navigator.webdriver ? 999 : speed)
    }
  }, [speed])

  return (
    <Player
      style={style}
      animationData={animationData}
      lottieRef={lottieRef}
      autoplay
      loop={false}
      onComplete={onComplete}
    />
  )
}

export default LottieAnimation
