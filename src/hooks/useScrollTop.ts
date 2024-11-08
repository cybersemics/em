import { useEffect, useState } from 'react'

/** Hook to use window.scrollTop immediately as it changes. Use when the throttled scrollTopStore is too slow. */
const useScrollTop = ({
  disabled,
}: {
  /** Can be disabled for efficiency. */
  disabled?: boolean
} = {}) => {
  const isEnabled = !disabled
  const [scrollTop, setScrollTop] = useState(window.scrollY)

  useEffect(() => {
    /** Set scrollTop on scroll. */
    const handleScroll = () => setScrollTop(window.scrollY)

    if (isEnabled) {
      handleScroll()

      window.addEventListener('scroll', handleScroll)
    }

    return () => window.removeEventListener('scroll', handleScroll)
  }, [isEnabled])

  return scrollTop
}

export default useScrollTop
