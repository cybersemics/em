import { useEffect, useState } from 'react'
import throttleByAnimationFrame from '../util/throttleByAnimationFrame'

/** Hook to use window.scrollTop when touchmove is detected. */
const useTouchMoveTop = () => {
  const [scrollTop, setScrollTop] = useState(window.scrollY)

  useEffect(() => {
    /** Set scrollTop on touch move. */
    const handleScroll = throttleByAnimationFrame(() => setScrollTop(window.scrollY))
    handleScroll()
    window.addEventListener('touchmove', handleScroll)

    return () => window.removeEventListener('touchmove', handleScroll)
  }, [])

  return scrollTop
}

export default useTouchMoveTop
