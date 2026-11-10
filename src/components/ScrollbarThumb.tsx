import { RefObject, useEffect, useRef } from 'react'
import { css } from '../../styled-system/css'

/** Minimum thumb height in px so the thumb stays visible on very long content. */
const MIN_THUMB_HEIGHT = 24

/** Delay in ms before the thumb fades out after scrolling stops, mimicking a native overlay scrollbar. */
const THUMB_HIDE_DELAY = 800

/**
 * A scrollbar thumb drawn over a scroll container whose native scrollbar is hidden (`scrollbarWidth: 'none'`). WebKit
 * cannot reliably recolor its native scrollbar: iOS ignores `scrollbar-color`, `::-webkit-scrollbar-*` and
 * `color-scheme`, and with scroll bars always shown, macOS and Linux draw a full-height light scrollbar even when there is
 * nothing to scroll (#6232). This thumb looks the same on every platform: thin, grey, sized in proportion to the content,
 * shown only while scrolling, and never shown when the content fits.
 *
 * Render it as a sibling of the scroll container, inside a positioned parent whose top and right edges line up with the
 * scroll container's viewport.
 */
const ScrollbarThumb = ({ scrollRef }: { scrollRef: RefObject<HTMLElement | null> }) => {
  const thumbRef = useRef<HTMLDivElement>(null)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    const scroller = scrollRef.current
    const thumb = thumbRef.current
    if (!scroller || !thumb) return

    /** Recomputes the thumb height and vertical position from the scroller's geometry. */
    const updateThumb = () => {
      const { scrollTop, scrollHeight, clientHeight } = scroller
      // Nothing to scroll — keep the thumb hidden.
      if (scrollHeight <= clientHeight) {
        thumb.style.opacity = '0'
        return
      }
      const thumbHeight = Math.max(MIN_THUMB_HEIGHT, (clientHeight / scrollHeight) * clientHeight)
      const maxThumbTop = clientHeight - thumbHeight
      const thumbTop = (scrollTop / (scrollHeight - clientHeight)) * maxThumbTop
      thumb.style.height = `${thumbHeight}px`
      thumb.style.transform = `translateY(${thumbTop}px)`
    }

    /** Shows the thumb, then schedules it to fade out once scrolling has stopped. */
    const showThumb = () => {
      if (scroller.scrollHeight <= scroller.clientHeight) return
      thumb.style.opacity = '1'
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = setTimeout(() => {
        thumb.style.opacity = '0'
      }, THUMB_HIDE_DELAY)
    }

    /** Updates the thumb geometry and reveals it while the user scrolls. */
    const handleScroll = () => {
      updateThumb()
      showThumb()
    }

    updateThumb()

    scroller.addEventListener('scroll', handleScroll, { passive: true })
    const resizeObserver = new ResizeObserver(updateThumb)
    resizeObserver.observe(scroller)

    return () => {
      scroller.removeEventListener('scroll', handleScroll)
      resizeObserver.disconnect()
      clearTimeout(hideTimerRef.current)
    }
  }, [scrollRef])

  return (
    <div
      ref={thumbRef}
      data-testid='scrollbar-thumb'
      aria-hidden
      className={css({
        position: 'absolute',
        top: 0,
        right: '2px',
        width: '4px',
        borderRadius: '2px',
        background: 'fgOverlay20',
        opacity: 0,
        transition: 'opacity 0.3s ease',
        pointerEvents: 'none',
        // Sits above the content and its decorative mask.
        zIndex: 1,
      })}
    />
  )
}

export default ScrollbarThumb
