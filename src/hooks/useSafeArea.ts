import { useEffect, useRef } from 'react'

interface SafeAreaInsets {
  top: number
  right: number
  bottom: number
  left: number
}

const vars = {
  top: '--spacing-safe-area-top',
  right: '--spacing-safe-area-right',
  bottom: '--spacing-safe-area-bottom',
  left: '--spacing-safe-area-left',
} as const

/** Reads safe area inset values from Panda CSS spacing tokens. */
const read = (): SafeAreaInsets => {
  const style = getComputedStyle(document.documentElement)
  return {
    top: parseInt(style.getPropertyValue(vars.top)) || 0,
    right: parseInt(style.getPropertyValue(vars.right)) || 0,
    bottom: parseInt(style.getPropertyValue(vars.bottom)) || 0,
    left: parseInt(style.getPropertyValue(vars.left)) || 0,
  }
}

/** Provides cached mobile device safe area insets (top, right, bottom, left), as integer values. Updates on resize.
 *
 * NOTE: The returned value is not reactive, so a safe area change alone will not trigger a re-render.
 * Something else in the component must cause a render to pick up the new value.
 * If stale values become a problem, switch to local reactive state (possibly throttled).
 */
const useSafeArea = (): SafeAreaInsets => {
  const insets = useRef(read())

  useEffect(() => {
    let rafId: number | null = null
    /** Re-reads safe area insets from computed CSS on resize, throttled to one read per frame. */
    const update = () => {
      if (rafId !== null) return
      rafId = requestAnimationFrame(() => {
        insets.current = read()
        rafId = null
      })
    }
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('resize', update)
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [])

  return insets.current
}

export default useSafeArea
