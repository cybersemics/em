/** Position fixed breaks in mobile Safari when the keyboard is up. This module provides functionality to emulate position:fixed by changing all top navigation to position:absolute and updating on scroll. */
import { useCallback, useEffect, useState } from 'react'
import { isIOS, isSafari, isTouch } from '../browser'
import * as selection from '../device/selection'
import reactMinistore from '../stores/react-ministore'

/** Set to true once the selectionchange handlers are added. Automatically initialized with the first call to usePositionFixed. */
let initialized = false

/** Initializes handler to switch position fixed elements to position absolute when the keyboard is up on mobile Safari. */
const init = () => {
  if (isTouch && isSafari() && !isIOS) {
    document.addEventListener('selectionchange', () => {
      const keyboardIsVisible = selection.isActive()
      positionFixedStore.update(keyboardIsVisible ? 'absolute' : 'fixed')
    })
  }
}

/** Default mode is fixed. Absolute mode emulates positioned fixed by switching to position absolute and updating the y position on scroll. */
const positionFixedStore = reactMinistore<'fixed' | 'absolute'>('fixed')

/** Emulates position fixed on mobile Safari with positon absolute. Returns { position, overflowX, top } in absolute mode. */
const usePositionFixed = (): {
  position: 'fixed' | 'absolute'
  overflowX?: 'hidden' | 'visible'
  top: number
} => {
  const [scrollTop, setScrollTop] = useState(window.scrollY)
  const onScroll = useCallback(() => {
    setScrollTop(window.scrollY)
  }, [])

  const mode = positionFixedStore.useState()

  useEffect(() => {
    if (!initialized) {
      init()
      initialized = true
    }

    if (mode === 'absolute') {
      // update the scroll position when the virtual keyboard goes up, otherwise the last scroll position will be used
      onScroll()

      window.addEventListener('scroll', onScroll)
    }

    return () => {
      window.removeEventListener('scroll', onScroll)
    }
  }, [mode, onScroll])

  return mode === 'absolute'
    ? {
        position: 'absolute',
        overflowX: 'hidden',
        top: scrollTop,
      }
    : {
        position: 'fixed',
        overflowX: 'visible',
        top: 0,
      }
}

export default usePositionFixed
