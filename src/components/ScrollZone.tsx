import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { Settings } from '../constants'
import getUserSetting from '../selectors/getUserSetting'
import viewportStore from '../stores/viewport'

/** Hook to use window.scrollTop immediately as it changes. Use when the throttled scrollTopStore is too slow. */
const useScrollTop = () => {
  const [scrollTop, setScrollTop] = useState(window.scrollY)

  useEffect(() => {
    /** Set scrollTop on scroll. */
    const handleScroll = () => setScrollTop(window.scrollY)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return scrollTop
}

/** An overlay for the scroll zone that blocks pointer events. */
const ScrollZone = ({ leftHanded }: { leftHanded?: boolean } = {}) => {
  const hideScrollZone = useSelector(state => state.showModal || getUserSetting(state, Settings.hideScrollZone))
  const scrollTop = useScrollTop()
  const scrollZoneWidth = viewportStore.useSelector(state => state.scrollZoneWidth)
  if (hideScrollZone) return null

  return (
    <div
      className={css({
        background: `url('/img/scroll-zone/stars.jpg')`,
        backgroundPositionX: '300px',
        backgroundSize: '2000px',
        zIndex: 'scrollZone',
        filter: 'grayscale(1)',
        position: 'fixed',
        left: leftHanded ? 0 : undefined,
        right: leftHanded ? undefined : 0,
        // height must exceed all possible scroll heights
        height: '999999px',
        opacity: 0.4,
        pointerEvents: 'none',
      })}
      style={{
        transform: `translateY(calc(-${scrollTop / 4 + 400}px))`,
        width: scrollZoneWidth,
      }}
    ></div>
  )
}

export default ScrollZone
