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
    setStarted(true)
  }, [])

  // track that long press has stopped on mouseUp, touchEnd, or touchCancel
  const stop = useCallback(() => {
    setStarted(false)
    setPressed(false)
    onLongPressEnd()
  }, [])

  // set long press state on scroll depending on completion of timer
  const scroll = useCallback(() => {
    setStarted(pressed)
  }, [pressed])

  return {
    // disable default long press to select word behavior
    // user-select and -webkit-touch-callout did not work for some reason
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
    style: {
      ...(pressed ? { userSelect: 'none', WebkitTouchCallout: 'none' } : null),
    } as React.CSSProperties,
  }
}

export default useLongPress
