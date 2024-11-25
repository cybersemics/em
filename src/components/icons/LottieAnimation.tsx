import Player, { LottieRefCurrentProps } from 'lottie-react'
import React, { useEffect, useLayoutEffect, useRef } from 'react'

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

  // skip the animation in Puppeteer tests to avoid inconsistent snapshots
  if (navigator.webdriver) {
    useLayoutEffect(() => {
      if (!lottieRef.current) return

      const lastFrame = lottieRef.current.getDuration(true)! - 1
      lottieRef.current.goToAndStop(lastFrame)
      onComplete?.()
    }, [onComplete])
  }

  useEffect(() => {
    if (lottieRef.current) {
      lottieRef.current.setSpeed(speed)
    }
  }, [speed])

  return (
    <Player
      style={style}
      animationData={animationData}
      lottieRef={lottieRef}
      // turn off autoplay in puppeteer tests
      autoplay={!navigator.webdriver}
      loop={false}
      onComplete={onComplete}
    />
  )
}

export default LottieAnimation
