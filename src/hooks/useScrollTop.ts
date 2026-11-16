import _ from 'lodash'
import { useEffect, useState } from 'react'

/** Hook to use window.scrollTop immediately as it changes. Use when the throttled scrollTopStore is too slow. */
const useScrollTop = ({
  disabled,
  throttle = 0,
}: {
  /** Can be disabled for efficiency. */
  disabled?: boolean
  /** Minimum interval between scroll updates, in milliseconds. Zero updates immediately. */
  throttle?: number
} = {}) => {
  const isEnabled = !disabled
  const [scrollTop, setScrollTop] = useState(window.scrollY)

  useEffect(() => {
    /** Set scrollTop on scroll. */
    const updateScrollTop = () => setScrollTop(window.scrollY)
    const throttledScroll = _.throttle(updateScrollTop, throttle)
    const handleScroll = throttle ? throttledScroll : updateScrollTop

    if (isEnabled) {
      updateScrollTop()

      window.addEventListener('scroll', handleScroll)
      window.visualViewport?.addEventListener('scroll', handleScroll)
    }

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.visualViewport?.removeEventListener('scroll', handleScroll)
      throttledScroll.cancel()
    }
  }, [isEnabled, throttle])

  return scrollTop
}

export default useScrollTop
