import { useCallback, useEffect, useRef, useState } from 'react'

/** Custom hook useLongPress.js to manage long press. */
export default function useLongPress(onLongPressStart = () => {}, onLongPressEnd = () => {}, ms = 250) {
  const [startLongPress, setStartLongPress] = useState(false)
  const [startCallbackDispatched, setStartCallbackDispatched] = useState(false)
  const timerIdRef = useRef()

  useEffect(() => {
    if (startLongPress) {
      timerIdRef.current = setTimeout(() => {
        onLongPressStart()
        setStartCallbackDispatched(true)
      }, ms)
    }
    else clearTimeout(timerIdRef.current)

    return () => clearTimeout(timerIdRef.current)
  }, [startLongPress])

  const start = useCallback(e => {
    setStartLongPress(true)
  }, [])
  const stop = useCallback(() => {
    setStartLongPress(false)
    onLongPressEnd()
    setStartCallbackDispatched(false)
  }, [])
  const scroll = useCallback(() => {
    if (!startCallbackDispatched) setStartLongPress(false)
    else setStartLongPress(true)
  }, [startCallbackDispatched])

  return {
    onMouseDown: start,
    onMouseUp: stop,
    onTouchStart: start,
    onTouchEnd: stop,
    onTouchMove: scroll,
    onTouchCancel: stop
  }
}
