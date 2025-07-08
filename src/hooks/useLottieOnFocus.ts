import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * A custom hook that triggers Lottie animations when a command is focused/highlighted.
 * The animation fires after 3 seconds of focus, then repeats every 5 seconds.
 */
const useLottieOnFocus = ({ hasAnimation }: { hasAnimation: boolean }) => {
  const [isAnimated, setIsAnimated] = useState(false)
  const initialDelayRef = useRef<NodeJS.Timeout | null>(null)
  const repeatIntervalRef = useRef<NodeJS.Timeout | null>(null)

  /** Callback for when animation completes. */
  const onAnimationComplete = useCallback(() => {
    setIsAnimated(false)
  }, [])

  useEffect(() => {
    /** Clears all timers. */
    const clearTimers = () => {
      if (initialDelayRef.current) {
        clearTimeout(initialDelayRef.current)
        initialDelayRef.current = null
      }
      if (repeatIntervalRef.current) {
        clearInterval(repeatIntervalRef.current)
        repeatIntervalRef.current = null
      }
    }

    if (hasAnimation) {
      // Clear any existing timers
      clearTimers()

      // Set initial delay of 3 seconds
      initialDelayRef.current = setTimeout(() => {
        setIsAnimated(true)

        // Set up repeating interval of 5 seconds
        repeatIntervalRef.current = setInterval(() => {
          setIsAnimated(true)
        }, 5000)
      }, 3000)
    } else {
      // Clear timers and reset animation state when not focused
      clearTimers()
      setIsAnimated(false)
    }

    return () => {
      clearTimers()
    }
  }, [hasAnimation])

  return {
    isAnimated,
    onAnimationComplete,
  }
}

export default useLottieOnFocus
