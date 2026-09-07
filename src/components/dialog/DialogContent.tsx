import { PropsWithChildren, RefObject, useEffect, useRef } from 'react'
import { dialogRecipe } from '../../../styled-system/recipes'

/** Minimum thumb height in px so the thumb stays visible on very long content. */
const MIN_THUMB_HEIGHT = 24

/** Delay in ms before the thumb fades out after scrolling stops, mimicking a native overlay scrollbar. */
const THUMB_HIDE_DELAY = 800

/**
 * Content for dialog box. Renders a custom scrollbar thumb over the scrollable region because iOS
 * WebKit cannot recolor its native overflow scrollbar via CSS (it renders dark on iOS < 26 regardless
 * of `scrollbar-color` / `::-webkit-scrollbar-*` / `color-scheme`). The native scrollbar is hidden in
 * dialogRecipe and this JS-driven thumb provides a grey scrollbar consistent across all platforms.
 *
 * `scrollRef` is forwarded onto the scrollable region so the consumer can read/control the scroll
 * position (e.g. the Command Universe resets it to the top when its search results crossfade).
 */
const DialogContent: React.FC<PropsWithChildren<{ scrollRef: RefObject<HTMLDivElement | null> }>> = ({
  children,
  scrollRef,
}) => {
  const dialog = dialogRecipe()
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
    <div className={dialog.contentWrapper}>
      <div ref={scrollRef} className={dialog.content}>
        <div className={dialog.contentInner}>{children}</div>
      </div>
      <div ref={thumbRef} className={dialog.scrollbarThumb} aria-hidden />
    </div>
  )
}

export default DialogContent
