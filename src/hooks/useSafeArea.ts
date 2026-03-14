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

/** Returns cached safe area insets (top, right, bottom, left) in pixels. Updates on resize. */
const useSafeArea = (): SafeAreaInsets => {
  const insets = useRef(read())

  useEffect(() => {
    const update = () => {
      insets.current = read()
    }
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return insets.current
}

export default useSafeArea
