import { useCallback, useEffect, useRef, useState } from 'react'
import { NOOP } from '../constants'

/** Custom hook useLongPress.js to manage long press. */
export default function useLongPress(onLongPressStart = NOOP, onLongPressEnd = NOOP, ms = 250) {
  const [startLongPress, setStartLongPress] = useState(false)
  const [startCallbackDispatched, setStartCallbackDispatched] = useState(false)
  const timerIdRef = useRef()

  // when a long press is started, set a timer
  // after the timer completes invoke the callback
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

  // track that long press has started on mouseDown or touchStart
  const start = useCallback(e => {
    setStartLongPress(true)
  }, [])

  // track that long press has stopped on mouseUp, touchEnd, or touchCancel
  const stop = useCallback(() => {
    setStartLongPress(false)
    onLongPressEnd()
    setStartCallbackDispatched(false)
  }, [])

  // set long press state on scroll depending on completion of timer
  const scroll = useCallback(() => {
    setStartLongPress(startCallbackDispatched)
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
