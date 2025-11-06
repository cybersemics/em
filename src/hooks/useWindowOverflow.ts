import { useLayoutEffect, useState } from 'react'

/** A hook that returns the left and right overflow of the element outside the bounds of the screen. Do not re-calculate on every render or it will create an infinite loop when scrolling the Toolbar. */
const useWindowOverflow = (ref: React.RefObject<HTMLElement | null>) => {
  const [overflow, setOverflow] = useState({ left: 0, right: 0 })

  useLayoutEffect(() => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    // Subtract the previous overflow, since that affects the client rect.
    // Otherwise the overflow will alternate on each render as it moves on and off the screen.
    const left = Math.max(0, -rect.x + 15 - overflow.left)
    // add 10px for padding
    const right = Math.max(0, rect.x + rect.width - window.innerWidth + 10 - overflow.right)
    if (left > 0 || right > 0) {
      setOverflow({ left, right })
    }
  }, [ref, overflow.left, overflow.right])

  return overflow
}

export default useWindowOverflow
