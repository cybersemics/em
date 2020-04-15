// useLongPress.js custom hook to manage long press
import { useState, useEffect, useCallback, useRef } from 'react'

export default function useLongPress(onLongPressStart = () => {}, onLongPressEnd = () => {}, ms = 250, dragInProgress = false) {
  const [startLongPress, setStartLongPress] = useState(false)
  const timerIdRef = useRef()

  useEffect(() => {
    if (startLongPress) timerIdRef.current = setTimeout(onLongPressStart, ms)
    else clearTimeout(timerIdRef.current)

    return () => clearTimeout(timerIdRef.current)
  }, [startLongPress])

  const start = useCallback(e => {
    setStartLongPress(true)
  }, [])
  const stop = useCallback(() => {
    setStartLongPress(false)
    onLongPressEnd()
  })

  return {
    onMouseDown: start,
    onMouseUp: stop,
    onTouchStart: start,
    onTouchEnd: stop,
  }
}
