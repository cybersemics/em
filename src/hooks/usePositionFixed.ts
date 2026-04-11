/**
 * Position fixed breaks in mobile Safari when the keyboard is up. This module provides
 * functionality to emulate position:fixed by changing all top navigation to position:absolute.
 * When the ScrollTimeline Web Animations API is available the scroll offset is driven by a
 * scroll-driven animation (no JS re-renders on every scroll event). Otherwise the position is
 * updated via a reactive scroll listener as a fallback.
 */
import { useEffect, useRef } from 'react'
import { token } from '../../styled-system/tokens'
import safariKeyboardStore from '../stores/safariKeyboardStore'
import viewportStore from '../stores/viewport'
import useScrollTop from './useScrollTop'

/** True if the browser supports the ScrollTimeline Web Animations API. */
const supportsScrollTimeline = 'ScrollTimeline' in window

/** Emulates position fixed on mobile Safari with position absolute. Returns { position, top, bottom, ref } where ref should be attached to the target element to enable scroll-driven animation. */
const usePositionFixed = ({
  fromBottom,
  offset = 0,
  height,
}: {
  fromBottom?: boolean
  offset?: number
  /** The height of the container, used to calculate the bottom offset on mobile safari. Only use with `fromBottom`. */
  height?: number
} = {}): {
  position: 'fixed' | 'absolute'
  top?: string
  bottom?: string
  /** Attach this ref to the element so that ScrollTimeline can drive its position without triggering React re-renders on scroll. */
  ref: React.RefObject<HTMLElement | null>
} => {
  const elementRef = useRef<HTMLElement | null>(null)
  const safariKeyboard = safariKeyboardStore.useState()
  const position = safariKeyboard.open ? 'absolute' : 'fixed'
  // Disable useScrollTop when ScrollTimeline is supported: the animation drives the offset instead.
  const scrollTop = useScrollTop({ disabled: position === 'fixed' || supportsScrollTimeline })
  const { innerHeight } = viewportStore.useState()

  /** Set up a scroll-driven animation when the keyboard is open and ScrollTimeline is available. Re-runs when keyboard state, viewport dimensions, or layout options change. */
  useEffect(() => {
    const el = elementRef.current
    const scrollingElement = document.scrollingElement || document.body
    if (!el || !supportsScrollTimeline || position !== 'absolute' || !scrollingElement) return

    let animation: Animation | undefined

    /** Calculates the initial top offset for the element (without the scroll contribution). */
    const initialTop = fromBottom ? innerHeight - safariKeyboard.height - (height ?? 0) - offset : offset

    /** Creates or recreates the scroll-driven animation based on the current document scroll range. */
    const setupAnimation = () => {
      animation?.cancel()
      const maxScroll = scrollingElement.scrollHeight - window.innerHeight
      if (!elementRef.current || maxScroll <= 0) return
      const timeline = new ScrollTimeline({ source: scrollingElement, axis: 'block' })
      // Animate translateY from 0 (no scroll) to maxScroll (fully scrolled) so that the absolute-
      // positioned element tracks the viewport as the user scrolls, matching position:fixed behaviour.
      animation = elementRef.current.animate(
        [{ transform: `translateY(${initialTop}px)` }, { transform: `translateY(${initialTop + maxScroll}px)` }],
        { timeline, fill: 'both' },
      )
    }

    setupAnimation()

    // Re-create the animation when the document height changes (e.g. content is added or removed).
    const resizeObserver = new ResizeObserver(setupAnimation)
    resizeObserver.observe(document.body)

    return () => {
      animation?.cancel()
      resizeObserver.disconnect()
    }
  }, [position, fromBottom, offset, height, innerHeight, safariKeyboard.height])

  let top, bottom
  if (position === 'absolute') {
    if (supportsScrollTimeline) {
      // With ScrollTimeline the animation drives translateY on top of top:0, so return top:0 as the
      // layout base. The animation keyframes incorporate initialTop so the rendered position is correct.
      top = '0'
    } else {
      // Fallback: compute the absolute top position reactively using scrollTop.
      top = fromBottom
        ? `${Math.min(document.body.scrollHeight, scrollTop + innerHeight - safariKeyboard.height) - (height ?? 0) - offset}px`
        : `${scrollTop + offset}px`
    }
  } else if (fromBottom) {
    // spacing.safeAreaBottom applies to rounded screens
    bottom = `calc(${token('spacing.safeAreaBottom')} + ${offset}px)`
  } else {
    // spacing.safeAreaTop applies to rounded screens
    top = `calc(${token('spacing.safeAreaTop')} + ${offset}px)`
  }

  return {
    position: position ?? 'fixed',
    top,
    bottom,
    ref: elementRef,
  }
}

export default usePositionFixed
