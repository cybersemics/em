/** Position fixed breaks in mobile Safari when the keyboard is up. This module provides functionality to emulate position:fixed by changing all top navigation to position:absolute and updating on scroll. */
import { token } from '../../styled-system/tokens'
import safariKeyboardStore from '../stores/safariKeyboardStore'
import viewportStore from '../stores/viewport'
import useScrollTop from './useScrollTop'

/** Emulates position fixed on mobile Safari with positon absolute. Returns { position, top, bottom } in absolute mode. */
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
} => {
  const safariKeyboard = safariKeyboardStore.useState()
  const position = safariKeyboard.open ? 'absolute' : 'fixed'
  const scrollTop = useScrollTop({ disabled: position === 'fixed' })
  const { innerHeight } = viewportStore.useState()

  let top, bottom
  if (position === 'absolute') {
    top = fromBottom
      ? `${scrollTop + innerHeight - safariKeyboard.height - (height ?? 0) - offset}px`
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
  }
}

export default usePositionFixed
