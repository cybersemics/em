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

/** An overlay for the scroll zone that blocks pointer events. */
const ScrollZone = ({ leftHanded }: { leftHanded?: boolean } = {}) => {
  const scrollTop = useScrollTop({ disabled: supportsScrollTimeline })
  const lastHapticScrollPosition = useRef<number>(0)
  const scrollZoneRef = useRef<HTMLDivElement>(null)
  const scrollZoneWidth = viewportStore.useSelector(state => state.scrollZoneWidth)
  const hideScrollZone = useSelector(state => state.showModal || getUserSetting(state, Settings.hideScrollZone))
  const showScrollZoneHelpAlert = useSelector(state => state.alert?.alertType === AlertType.ScrollZoneHelp)

  /** Haptic feedback on scroll. Attaches a passive scroll listener when ScrollTimeline is supported to avoid relying on re-renders, and uses the reactive scrollTop state as a fallback. */
  useEffect(() => {
    /** Triggers haptic light feedback if the scroll position has changed by at least 5px since the last haptic event. */
    const triggerHapticIfNeeded = (currentScrollTop: number) => {
      const diff = Math.abs(lastHapticScrollPosition.current - currentScrollTop)
      if (diff >= 5) {
        if (globals.touching) {
          haptics.light()
        }
        lastHapticScrollPosition.current = currentScrollTop
      }
    }

    if (supportsScrollTimeline) {
      /** Handles scroll events for haptic feedback when ScrollTimeline drives the parallax. */
      const handleScroll = () => triggerHapticIfNeeded(window.scrollY)
      window.addEventListener('scroll', handleScroll, { passive: true })
      return () => window.removeEventListener('scroll', handleScroll)
    } else {
      triggerHapticIfNeeded(scrollTop)
    }
  }, [scrollTop])

  /** Set up a scroll-driven parallax animation using the ScrollTimeline Web Animations API. Re-runs when the scroll zone becomes visible to ensure the ref is populated. */
  useEffect(() => {
    const scrollingElement = document.scrollingElement || document.body
    if (!scrollZoneRef.current || !supportsScrollTimeline || !scrollingElement) return

    let animation: Animation | undefined

    /** Creates or recreates the scroll-driven parallax animation based on the current document scroll height. */
    const setupAnimation = () => {
      animation?.cancel()
      const maxScroll = scrollingElement.scrollHeight - window.innerHeight
      if (!scrollZoneRef.current || maxScroll <= 0) return
      const timeline = new ScrollTimeline({ source: scrollingElement, axis: 'block' })
      animation = scrollZoneRef.current.animate(
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
  }, [hideScrollZone])

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
      style={{
        // Fall back to JS-driven transform when ScrollTimeline is not supported
        transform: supportsScrollTimeline ? undefined : `translateY(-${scrollTop / 4 + 300}px)`,
        width: scrollZoneWidth,
      }}
    ></div>
  )
}

export default ScrollZone
