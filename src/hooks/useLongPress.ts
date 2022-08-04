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
    // Set .pressed so that user-select: none can be applied to disable long press to select on iOS. If user-select: none is added after touchstart, it does not prevent magnifying glass text selection (unresolved). -webkit-touch-callout does not help. It seems the only way to disable it fully is to preventDefault on touchstart. However, this would break navigation in edit mode.
    // See: https://stackoverflow.com/questions/923782/disable-the-text-highlighting-magnifier-on-touch-hold-on-mobile-safari-webkit
    classNames: {
      pressed,
    },
  }
}

export default useLongPress
