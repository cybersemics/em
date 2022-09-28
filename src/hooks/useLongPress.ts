import { useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch } from 'react-redux'
import editing from '../action-creators/editing'
import { NOOP } from '../constants'
import * as selection from '../device/selection'

// number of pixels of scrolling to allow before abandoning the long tap
const SCROLL_THRESHOLD = 10

/** Custom hook to manage long press. */
const useLongPress = (
  onLongPressStart: (() => void) | null = NOOP,
  onLongPressEnd: (() => void) | null = NOOP,
  onTouchStart: (() => void) | null = NOOP,
  ms = 250,
) => {
  const [started, setStarted] = useState(false)
  const [pressed, setPressed] = useState(false)
  const [scrollStart, setScrollStart] = useState(0)
  const timerIdRef = useRef<number | undefined>()
  const dispatch = useDispatch()

  // when a long press is started, set a timer
  // after the timer completes invoke the callback
  useEffect(() => {
    if (started) {
      // cast Timeout to number for compatibility with clearTimeout
      timerIdRef.current = setTimeout(() => {
        if (Math.abs(window.scrollY - scrollStart) > SCROLL_THRESHOLD) return
        onLongPressStart?.()
        setPressed(true)
      }, ms) as unknown as number
    } else clearTimeout(timerIdRef.current)

    return () => clearTimeout(timerIdRef.current)
  }, [started])

  // track that long press has started on mouseDown or touchStart
  const start = useCallback(e => {
    // do not stop propagation, or it will break MultiGesture
    setStarted(true)
    setScrollStart(window.scrollY)
    onTouchStart?.()
  }, [])

  // track that long press has stopped on mouseUp, touchEnd, or touchCancel
  // Note: This method is not guaranteed to be called, so make sure you perform any cleanup from onLongPressStart elsewhere (e.g. in useDragHold.
  // TODO: Maybe an unmount handler would be better?
  const stop = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      // Delay setPressed to ensure that onLongPressEnd is not called until bubbled events complete.
      // This gives other components a chance to short circuit.
      // We can't stop propagation here without messing up other components like Bullet.
      setTimeout(() => {
        setStarted(false)
        setPressed(false)
        onLongPressEnd?.()
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
