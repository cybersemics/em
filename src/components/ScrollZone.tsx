import { useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { AlertType, Settings } from '../constants'
import globals from '../globals'
import useScrollTop from '../hooks/useScrollTop'
import getUserSetting from '../selectors/getUserSetting'
import viewportStore from '../stores/viewport'
import haptics from '../util/haptics'

/** True if the browser supports the ScrollTimeline Web Animations API. */
const supportsScrollTimeline = 'ScrollTimeline' in window

/** Triggers haptic light feedback on scroll. Uses a passive scroll listener for efficiency. */
const useScrollHaptics = () => {
  const lastHapticScrollPosition = useRef<number>(0)

  useEffect(() => {
    /** Fires haptic light feedback if the scroll position has changed by at least 5px since the last haptic event. */
    const triggerHapticIfNeeded = (currentScrollTop: number) => {
      const diff = Math.abs(lastHapticScrollPosition.current - currentScrollTop)
      if (diff >= 5) {
        if (globals.touching) {
          haptics.light()
        }
        lastHapticScrollPosition.current = currentScrollTop
      }
    }

    /** Handles scroll events for haptic feedback. */
    const handleScroll = () => triggerHapticIfNeeded(window.scrollY)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
}

/**
 * Sets up a scroll-driven parallax translateY animation on the given element.
 * When ScrollTimeline is supported, uses a compositor-driven animation and returns undefined.
 * Falls back to a JS-driven inline transform string when not supported.
 */
const useScrollParallax = ({
  disabled,
  ref,
}: {
  /** Can be any truthy value to disable the animation. */
  disabled?: unknown
  ref: React.RefObject<HTMLDivElement | null>
}): string | undefined => {
  const scrollTop = useScrollTop({ disabled: !!(disabled || supportsScrollTimeline) })

  useEffect(() => {
    const scrollingElement = document.scrollingElement || document.body
    if (!ref.current || !supportsScrollTimeline || !scrollingElement || disabled) return

    let animation: Animation | undefined

    /** Creates or recreates the scroll-driven parallax animation based on the current document scroll height. */
    const setupAnimation = () => {
      animation?.cancel()
      const maxScroll = scrollingElement.scrollHeight - window.innerHeight
      if (!ref.current || maxScroll <= 0) return
      const timeline = new ScrollTimeline({ source: scrollingElement, axis: 'block' })
      animation = ref.current.animate(
        [{ transform: 'translateY(-300px)' }, { transform: `translateY(-${maxScroll / 4 + 300}px)` }],
        { timeline, fill: 'both' },
      )
    }

    setupAnimation()

    // Re-create animation when document height changes (e.g. content added or removed)
    const resizeObserver = new ResizeObserver(setupAnimation)
    resizeObserver.observe(document.body)

    return () => {
      animation?.cancel()
      resizeObserver.disconnect()
    }
  }, [disabled, ref])

  return supportsScrollTimeline ? undefined : `translateY(-${scrollTop / 4 + 300}px)`
}

/** An overlay for the scroll zone that blocks pointer events. */
const ScrollZone = ({ leftHanded }: { leftHanded?: boolean } = {}) => {
  const scrollZoneRef = useRef<HTMLDivElement>(null)
  const scrollZoneWidth = viewportStore.useSelector(state => state.scrollZoneWidth)
  const hideScrollZone = useSelector(state => state.showModal || getUserSetting(state, Settings.hideScrollZone))
  const showScrollZoneHelpAlert = useSelector(state => state.alert?.alertType === AlertType.ScrollZoneHelp)

  useScrollHaptics()
  const transform = useScrollParallax({ ref: scrollZoneRef, disabled: hideScrollZone })

  if (hideScrollZone) return null

  return (
    <div
      ref={scrollZoneRef}
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
      style={{ transform, width: scrollZoneWidth }}
    ></div>
  )
}

export default ScrollZone
