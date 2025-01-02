/** Position fixed breaks in mobile Safari when the keyboard is up. This module provides functionality to emulate position:fixed by changing all top navigation to position:absolute and updating on scroll. */
import { useEffect } from 'react'
import { token } from '../../styled-system/tokens'
import { isIOS, isSafari, isTouch } from '../browser'
import * as selection from '../device/selection'
import reactMinistore from '../stores/react-ministore'
import once from '../util/once'
import useScrollTop from './useScrollTop'

/** Default mode is fixed. Absolute mode emulates positioned fixed by switching to position absolute and updating the y position on scroll. */
const positionFixedStore = reactMinistore<'fixed' | 'absolute' | null>(null)

/** Initializes handler to switch position fixed elements to position absolute when the keyboard is up on mobile Safari. Initialized once, permanently since the platform cannot change. */
const initEventHandler = once(() => {
  /** Updates the positionFixedStore state based on if the keyboard is visible. */
  const updatePositionFixed = () => {
    const keyboardIsVisible = selection.isActive()
    positionFixedStore.update(keyboardIsVisible ? 'absolute' : 'fixed')
  }

  if (isTouch && isSafari() && !isIOS) {
    updatePositionFixed()
    document.addEventListener('selectionchange', updatePositionFixed)
  }
})

/** Emulates position fixed on mobile Safari with positon absolute. Returns { position, overflowX, top } in absolute mode. */
const usePositionFixed = ({
  disableTop,
}: {
  disableTop?: boolean
} = {}): {
  position: 'fixed' | 'absolute'
  overflowX?: 'hidden' | 'visible'
  top?: string
} => {
  const position = positionFixedStore.useState()
  const scrollTop = useScrollTop({ disabled: position === 'fixed' })

  useEffect(initEventHandler, [])

  return {
    position: position ?? 'fixed',
    overflowX: position === 'absolute' ? 'hidden' : 'visible',
    /* spacing.safeAreaTop applies for rounded screens */
    top: disableTop ? undefined : position === 'absolute' ? `${scrollTop}px` : token('spacing.safeAreaTop'),
  }
}

export default usePositionFixed
