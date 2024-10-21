import Player, { LottieRefCurrentProps } from 'lottie-react'
import React, { useEffect, useRef } from 'react'

interface LottieAnimationProps {
  animationData: any
  speed?: number
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
}) => {
  const lottieRef = useRef<LottieRefCurrentProps | null>(null)

  useEffect(() => {
    if (lottieRef.current) {
      lottieRef.current.setSpeed(speed)
    }
  }, [speed])

  return (
    <Player
      animationData={animationData}
      style={{ width: '100%', height: '100%' }}
      lottieRef={lottieRef}
      autoplay
      loop={false}
    />
  )
}

export default LottieAnimation
