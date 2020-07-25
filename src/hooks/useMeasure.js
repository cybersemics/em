import { useEffect, useRef, useState } from 'react'
import ResizeObserver from 'resize-observer-polyfill'

/** Hook to observe elements size and position. */
const useMeasure = () => {
  const ref = useRef(null)
  const [bounds, set] = useState({ left: 0, top: 0, width: 0, height: 0 })
  const [ro] = useState(() => new ResizeObserver(([entry]) => {
    window.requestAnimationFrame(() => set(entry.contentRect))
  }))
  useEffect(() => {
    if (ref.current) {
      ro.observe(ref.current)
    }
    return () => ro.disconnect()
  }, [])
  return [{ ref }, bounds]
}

export default useMeasure
