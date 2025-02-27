/** Position fixed breaks in mobile Safari when the keyboard is up. This module provides functionality to emulate position:fixed by changing all top navigation to position:absolute and updating on scroll. */
import { token } from '../../styled-system/tokens'
import safariKeyboardStore from '../stores/safariKeyboardStore'
import viewportStore from '../stores/viewport'
import useScrollTop from './useScrollTop'

/** Emulates position fixed on mobile Safari with positon absolute. Returns { position, overflowX, top } in absolute mode. */
const usePositionFixed = ({
  fromBottom,
  offset = 0,
  height,
}: {
  fromBottom?: boolean
  offset?: number
  /** Only for if `fromBottom = true`. For calculating position on mobile safari. */
  height?: number
} = {}): {
  position: 'fixed' | 'absolute'
  top?: string
  bottom?: string
  display?: 'none'
} => {
  const safariKeyboard = safariKeyboardStore.useState()
  const position = safariKeyboard.open ? 'absolute' : 'fixed'
  const scrollTop = useScrollTop({ disabled: position === 'fixed' })
  const { innerHeight, currentKeyboardHeight } = viewportStore.useState()

  let top, bottom
  if (position === 'absolute') {
    top = fromBottom
      ? `${scrollTop + innerHeight - currentKeyboardHeight - (height ?? 0) - offset}px`
      : `${scrollTop + offset}px`
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
    /* Hide bottom elements while the keyboard is closing */
    display: fromBottom && safariKeyboard.closing ? 'none' : undefined,
  }
}

export default usePositionFixed
