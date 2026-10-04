import { MotionValue, useMotionValue } from 'motion/react'
import { useLayoutEffect } from 'react'
import { isCapacitor, isSafari } from '../browser'
import viewportStore from '../stores/viewportStore'
import virtualKeyboardStore from '../stores/virtualKeyboardStore'
import useScrollTop from './useScrollTop'

type PositionFixedOptions = {
  /** Anchor the element to the bottom instead of the top. */
  fromBottom?: boolean
  /** Additional pixel offset from the anchored edge (top or bottom). */
  offset?: number
  /** Container height for bottom positioning on mobile Safari. */
  height?: number
}

/**
 * Safe-area-aware, keyboard-aware and iOS-safe fixed positioning for mobile.
 *
 * Returns `{ position, top, bottom }` styles that keep an element pinned to a viewport edge, while offsetting the
 * position of the element to ensure it remains visible when the keyboard is open and avoids safe areas.
 * Bottom-anchored consumers receive MotionValues for their keyboard-dependent styles and must use a Motion element.
 * Scalar store subscriptions update those values without rendering the consumer on each keyboard frame.
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
function usePositionFixed(options?: PositionFixedOptions & { fromBottom?: false }): {
  position: 'fixed' | 'absolute'
  top?: string
  bottom?: string
}
function usePositionFixed(options: PositionFixedOptions): {
  position: 'fixed' | 'absolute'
  top?: string | MotionValue<string>
  bottom?: string
  translate?: MotionValue<string>
  willChange?: string
}
function usePositionFixed({ fromBottom, offset = 0, height }: PositionFixedOptions = {}): {
  position: 'fixed' | 'absolute'
  top?: string | MotionValue<string>
  bottom?: string
  translate?: MotionValue<string>
  willChange?: string
} {
  const keyboardOpen = virtualKeyboardStore.useSelector(state => state.open)
  // On iOS Safari, emulate `position: fixed` using absolute positioning when the virtual keyboard is open.
  const position = keyboardOpen && isSafari() && !isCapacitor() ? 'absolute' : 'fixed'

  // Only subscribe to scroll events when emulating with position: fixed. mode — in fixed mode, scroll position
  // is irrelevant and listening would cause unnecessary re-renders.
  const scrollTop = useScrollTop({ disabled: position === 'fixed' })
  const { innerHeight } = viewportStore.useState()

  const bodyHeight = position === 'absolute' && fromBottom ? document.body.scrollHeight : 0
  const currentHeight = virtualKeyboardStore.getState().height
  const keyboardTranslate = useMotionValue(`0 ${-currentHeight}px`)
  const keyboardTop = useMotionValue(
    `calc(min(${bodyHeight}px, ${scrollTop + innerHeight}px - ${currentHeight}px) - ${(height ?? 0) + offset}px - env(safe-area-inset-bottom))`,
  )
  useLayoutEffect(() => {
    if (!fromBottom) return
    /** Maps scalar geometry directly to declarative styles, without another derived-value frame. */
    const update = (value: number) => {
      keyboardTranslate.set(`0 ${-value}px`)
      keyboardTop.set(
        `calc(min(${bodyHeight}px, ${scrollTop + innerHeight}px - ${value}px) - ${(height ?? 0) + offset}px - env(safe-area-inset-bottom))`,
      )
    }
    update(virtualKeyboardStore.getState().height)
    return virtualKeyboardStore.subscribeSelector(state => state.height, update)
  }, [fromBottom, bodyHeight, scrollTop, innerHeight, height, offset, keyboardTranslate, keyboardTop])

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
      // Motion updates this style from scalar height without rendering the consumer on each frame.
      top = keyboardTop
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
      translate = keyboardTranslate
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
