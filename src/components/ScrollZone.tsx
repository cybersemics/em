import { useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { AlertType, Settings } from '../constants'
import globals from '../globals'
import useScrollTop from '../hooks/useScrollTop'
import getUserSetting from '../selectors/getUserSetting'
import viewportStore from '../stores/viewport'
import haptics from '../util/haptics'

/** An overlay for the scroll zone that blocks pointer events. */
const ScrollZone = ({ leftHanded }: { leftHanded?: boolean } = {}) => {
  const scrollTop = useScrollTop()
  const lastHapticScrollPosition = useRef<number>(0)
  const scrollZoneWidth = viewportStore.useSelector(state => state.scrollZoneWidth)
  const hideScrollZone = useSelector(
    state => state.showModal || getUserSetting(state, Settings.hideScrollZone) || state.showCommandCenter,
  )
  const showScrollZoneHelpAlert = useSelector(state => state.alert?.alertType === AlertType.ScrollZoneHelp)

  /** Haptic feedback on scroll. */
  useEffect(() => {
    const hapticScrollDifference = Math.abs(lastHapticScrollPosition.current - scrollTop)
    if (hapticScrollDifference >= 5) {
      if (globals.touching) {
        haptics.light()
      }
      lastHapticScrollPosition.current = scrollTop
    }
  }, [scrollTop])

  if (hideScrollZone) return null

  return (
    <div
      className={css({
        backgroundImage: `url('/img/scroll-zone/stardust.png')`,
        backgroundRepeat: 'repeat',
        zIndex: 'scrollZone',
        backgroundSize: '800px',
        position: 'fixed',
        left: leftHanded ? 0 : undefined,
        right: leftHanded ? undefined : 0,
        // height must exceed all possible scroll heights
        height: '999999px',
        pointerEvents: 'none',
        animation: showScrollZoneHelpAlert
          ? 'pulseBackgroundHighlight 1s cubic-bezier(0, 0.2, 0.8, 1) infinite alternate'
          : undefined,
      })}
      style={{
        transform: `translateY(-${scrollTop / 4 + 300}px)`,
        width: scrollZoneWidth,
      }}
    ></div>
  )
}

export default ScrollZone
