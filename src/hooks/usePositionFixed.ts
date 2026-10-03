import { RefObject, useLayoutEffect } from 'react'
import { isCapacitor, isSafari } from '../browser'
import viewportStore from '../stores/viewportStore'
import virtualKeyboardStore from '../stores/virtualKeyboardStore'
import useScrollTop from './useScrollTop'

/**
 * Safe-area-aware, keyboard-aware and iOS-safe fixed positioning for mobile.
 *
 * Returns `{ position, top, bottom }` styles that keep an element pinned to a viewport edge, while offsetting the
 * position of the element to ensure it remains visible when the keyboard is open and avoids safe areas.
 *
 * The hook handles three concerns:
 *
 * 1. Safe-area insets: Offsets elements from the notch/status bar (top) and home indicator
 * (bottom) on rounded screens via `env(safe-area-inset-top)` / `env(safe-area-inset-bottom)`.
 *
 * 2. Keyboard avoidance: For bottom-anchored elements, offsets y position by the virtual keyboard
 * height – ensuring they remain visible even when the keyboard is open.
 *
 * 3. Broken `position: fixed` on iOS Safari: In MobileSafari, position: fixed is disabled when the keyboard
 * opens, leaving elements to scroll out of place. The workaround is to switch to `position: absolute`\
 * and recompute `top` from the current scroll position on every scroll frame, effectively re-implementing
 * fixed positioning.
 *
 */
const usePositionFixed = ({
  fromBottom,
  offset = 0,
  height,
  elementRefs,
}: {
  /** Anchor position for the element. */
  fromBottom?: boolean
  /** Additional pixel offset from the anchored edge (top or bottom). */
  offset?: number
  /** The height of the container, used to calculate the bottom offset on mobile safari. Only use with `fromBottom`. */
  height?: number
  /** Elements positioned with these styles. Enables timed compositor motion when the keyboard supplies it. */
  elementRefs?: readonly RefObject<HTMLElement | null>[]
} = {}): {
  position: 'fixed' | 'absolute'
  top?: string
  bottom?: string
  translate?: string
  willChange?: string
} => {
  const keyboardOpen = virtualKeyboardStore.useSelector(state => state.open)

  // On iOS Safari, emulate `position: fixed` using absolute positioning when the virtual keyboard is open.
  const position = keyboardOpen && isSafari() && !isCapacitor() ? 'absolute' : 'fixed'

  // Only subscribe to scroll events when emulating with position: fixed. mode — in fixed mode, scroll position
  // is irrelevant and listening would cause unnecessary re-renders.
  const scrollTop = useScrollTop({ disabled: position === 'fixed' })
  const { innerHeight } = viewportStore.useState()

  useLayoutEffect(() => {
    if (!fromBottom || !elementRefs || position !== 'fixed') return
    let animations: Animation[] = []
    // Native motion must start without waiting for the positioned component to render.
    const updateMotion = () => {
      animations.forEach(animation => animation.cancel())
      animations = []
      const { motion } = virtualKeyboardStore.getState()
      if (!motion || motion.duration <= 0) return
      const frames = motion.heights.map((height, index) => ({
        offset: index / (motion.heights.length - 1),
        translate: `0 ${-height}px`,
      }))
      const startedAt = performance.now() - (Date.now() - motion.startedAt)
      animations = elementRefs.flatMap(ref => {
        if (!ref.current) return []
        const animation = ref.current.animate(frames, { duration: motion.duration, fill: 'both' })
        animation.startTime = startedAt
        return [animation]
      })
    }
    const unsubscribe = virtualKeyboardStore.subscribeSelector(state => state.motion, updateMotion)
    updateMotion()
    return () => {
      unsubscribe()
      animations.forEach(animation => animation.cancel())
    }
  }, [elementRefs, fromBottom, position])

  let top, bottom, translate

  // Calculate `top` values for absolute positioning (emulating `position: fixed`)
  if (position === 'absolute') {
    if (fromBottom) {
      // Position the element at the bottom of the visible area, above the keyboard.
      //
      // The visible bottom edge is calculated with:
      //   scrollTop + innerHeight - virtualKeyboard.height
      //
      // We clamp this to document.body.scrollHeight so the element never extends past
      // the document boundary (e.g. when the page is shorter than the viewport).
      //
      // Then subtract the element's own height and offset if provided by the caller, and subtract the
      // safe-area-bottom inset so the element doesn't overlap the rounded-screen home indicator.
      //
      // Read animated height from CSS so each keyboard frame can move the element without a React render.
      const visibleBottom = `min(${document.body.scrollHeight}px, ${scrollTop + innerHeight}px - var(--virtual-keyboard-height, 0px))`
      top = `calc(${visibleBottom} - ${(height ?? 0) + offset}px - env(safe-area-inset-bottom))`
    } else {
      // fromTop
      // Position the element at the top of the visible area.
      // scrollTop gives the top of the visible viewport. Add safe-area-top for
      // rounded screens (e.g. iPhone notch) and any additional offset if provided.
      top = `calc(${scrollTop}px + env(safe-area-inset-top) + ${offset}px)`
    }
  }

  // Calculate `top` values for normal `position: fixed`.
  if (position === 'fixed') {
    if (fromBottom) {
      // Normal fixed positioning anchored to the bottom — safe-area-bottom keeps the element
      // above the home indicator on rounded screens, and virtualKeyboard.height pushes it
      // above the keyboard when open.
      bottom = `calc(env(safe-area-inset-bottom) + ${offset}px)`
      // Translation can run on the compositor; changing bottom requires layout on every keyboard frame.
      translate = '0 calc(-1 * var(--virtual-keyboard-height, 0px))'
    } else {
      // fromTop
      // Normal fixed positioning anchored to the top — safe-area-top keeps the element
      // below the notch/status bar on rounded screens.
      top = `calc(env(safe-area-inset-top) + ${offset}px)`
    }
  }

  return {
    position: position ?? 'fixed',
    top,
    bottom,
    ...(translate && {
      translate,
      willChange: 'transform',
    }),
  }
}

export default usePositionFixed
