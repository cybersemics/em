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
  overflowX?: 'hidden' | 'visible'
  top?: string
  bottom?: string
} => {
  const position = positionFixedStore.useState()
  const scrollTop = useScrollTop({ disabled: position === 'fixed' })

  useEffect(initEventHandler, [])
  let top, bottom
  if (position === 'absolute') {
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight
    top = fromBottom ? `${scrollTop + viewportHeight - (height ?? 0) - offset}px` : `${scrollTop + offset}px`
  } else if (fromBottom) {
    const keyboardHeight = window.visualViewport ? window.innerHeight - window.visualViewport.height : 0
    bottom = `calc(${token('spacing.safeAreaBottom')} + ${offset}px + ${keyboardHeight}px)`
  } else {
    top = `calc(${token('spacing.safeAreaTop')} + ${offset}px)`
  }

  return {
    position: position ?? 'fixed',
    overflowX: position === 'absolute' ? 'hidden' : 'visible',
    /* spacing.safeAreaTop applies for rounded screens */
    top,
    bottom,
  }
}

export default usePositionFixed
