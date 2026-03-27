import { token } from '../../styled-system/tokens'
import { isCapacitor, isSafari } from '../browser'
import viewportStore from '../stores/viewport'
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
 * (bottom) on rounded screens via `spacing.safeAreaTop` / `spacing.safeAreaBottom` tokens.
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
}: {
  /** Anchor position for the element. */
  fromBottom?: boolean
  /** Additional pixel offset from the anchored edge (top or bottom). */
  offset?: number
  /** The height of the container, used to calculate the bottom offset on mobile safari. Only use with `fromBottom`. */
  height?: number
} = {}): {
  position: 'fixed' | 'absolute'
  top?: string
  bottom?: string
} => {
  const virtualKeyboard = virtualKeyboardStore.useState()

  // On iOS Safari, emulate `position: fixed` using absolute positioning when the virtual keyboard is open.
  const position = virtualKeyboard.open && isSafari() && !isCapacitor() ? 'absolute' : 'fixed'

  // Only subscribe to scroll events when emulating with position: fixed. mode — in fixed mode, scroll position
  // is irrelevant and listening would cause unnecessary re-renders.
  const scrollTop = useScrollTop({ disabled: position === 'fixed' })
  const { innerHeight } = viewportStore.useState()

  // Use max() to smoothly transition between keyboard height and safe-area-bottom.
  // When the keyboard is open, virtualKeyboard.height > safeAreaBottom, so it dominates.
  // As the keyboard closing animation brings height toward 0, it naturally settles at
  // safeAreaBottom with no discontinuous snap.
  const bottomInset = `max(${virtualKeyboard.height}px, ${token('spacing.safeAreaBottom')})`

  let top, bottom

  // Calculate `top` values for absolute positioning (emulating `position: fixed`)
  if (position === 'absolute') {
    if (fromBottom) {
      // Position the element at the bottom of the visible area, above the keyboard.
      //
      // The visible bottom edge is:
      //   scrollTop + innerHeight
      //
      // We clamp this to document.body.scrollHeight so the element never extends past
      // the document boundary (e.g. when the page is shorter than the viewport).
      //
      // Then subtract the element's own height, offset, and bottomInset (the larger of
      // keyboard height or safe-area-bottom).
      //
      const visibleBottom = Math.min(document.body.scrollHeight, scrollTop + innerHeight)
      top = `calc(${visibleBottom - (height ?? 0) - offset}px - ${bottomInset})`
    } else {
      // fromTop
      // Position the element at the top of the visible area.
      // scrollTop gives the top of the visible viewport. Add safe-area-top for
      // rounded screens (e.g. iPhone notch) and any additional offset if provided.
      top = `calc(${scrollTop}px + ${token('spacing.safeAreaTop')} + ${offset}px)`
    }
  }

  // Calculate values for normal `position: fixed`.
  if (position === 'fixed') {
    if (fromBottom) {
      // bottomInset handles both keyboard avoidance and safe-area in a single value,
      // smoothly transitioning between them as the keyboard animates.
      bottom = `calc(${bottomInset} + ${offset}px)`
    } else {
      // fromTop
      // Normal fixed positioning anchored to the top — safe-area-top keeps the element
      // below the notch/status bar on rounded screens.
      top = `calc(${token('spacing.safeAreaTop')} + ${offset}px)`
    }
  }

  return {
    position: position ?? 'fixed',
    top,
    bottom,
  }
}

export default usePositionFixed
