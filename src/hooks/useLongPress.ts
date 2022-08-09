import { useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch } from 'react-redux'
import editing from '../action-creators/editing'
import { NOOP } from '../constants'
import * as selection from '../device/selection'

/** Custom hook to manage long press. */
const useLongPress = (onLongPressStart = NOOP, onLongPressEnd = NOOP, ms = 250) => {
  const [started, setStarted] = useState(false)
  const [pressed, setPressed] = useState(false)
  const timerIdRef = useRef<number | undefined>()
  const dispatch = useDispatch()

  // when a long press is started, set a timer
  // after the timer completes invoke the callback
  useEffect(() => {
    if (started) {
      // cast Timeout to number for compatibility with clearTimeout
      timerIdRef.current = setTimeout(() => {
        onLongPressStart()
        setPressed(true)
      }, ms) as unknown as number
    } else clearTimeout(timerIdRef.current)

    return () => clearTimeout(timerIdRef.current)
  }, [started])

  // track that long press has started on mouseDown or touchStart
  const start = useCallback(e => {
    // stop propagation to avoid useLongPress being trigger on ancestors
    e.stopPropagation()
    setStarted(true)
  }, [])

  // track that long press has stopped on mouseUp, touchEnd, or touchCancel
  const stop = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      // Delay setPressed to ensure that onLongPressEnd is not called until bubbled events complete.
      // This gives other components a chance to short circuit.
      // We can't stop propagation here without messing up other components like Bullet.
      setTimeout(() => {
        setStarted(false)
        setPressed(false)
        onLongPressEnd()
      }, 10)
    },
    [pressed],
  )

  // set long press state on scroll depending on completion of timer
  const scroll = useCallback(() => {
    setStarted(pressed)
  }, [pressed])

  return {
    // disable Android context menu
    // does not work to prevent iOS long press to select behavior
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      selection.clear()
      dispatch(editing({ value: false }))
    },
    onMouseDown: start,
    onMouseUp: stop,
    onTouchStart: start,
    onTouchEnd: stop,
    onTouchMove: scroll,
    onTouchCancel: stop,
  }
}

export default useLongPress
