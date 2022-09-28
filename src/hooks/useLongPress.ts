import { useCallback, useRef, useState } from 'react'
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
  const [pressed, setPressed] = useState(false)
  const [scrollStart, setScrollStart] = useState(0)
  const timerIdRef = useRef<number | undefined>()
  const dispatch = useDispatch()

  /** Starts the timer. Unless it is cleared by stop or unmount, it will set pressed and call onLongPressStart after the delay. */
  const startTimer = () => {
    setScrollStart(window.scrollY)

    // cast Timeout to number for compatibility with clearTimeout
    clearTimeout(timerIdRef.current)
    timerIdRef.current = setTimeout(() => {
      if (Math.abs(window.scrollY - scrollStart) > SCROLL_THRESHOLD) return
      onLongPressStart?.()
      setPressed(true)
    }, ms) as unknown as number
  }

  // track that long press has started on mouseDown or touchStart
  const start = useCallback(e => {
    // do not stop propagation, or it will break MultiGesture
    startTimer()
    setScrollStart(e.touches?.[0]?.clientY)
    onTouchStart?.()
  }, [])

  // track that long press has stopped on mouseUp, touchEnd, or touchCancel
  // Note: This method is not guaranteed to be called, so make sure you perform any cleanup from onLongPressStart elsewhere (e.g. in useDragHold.
  // TODO: Maybe an unmount handler would be better?
  const stop = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    // Delay setPressed to ensure that onLongPressEnd is not called until bubbled events complete.
    // This gives other components a chance to short circuit.
    // We can't stop propagation here without messing up other components like Bullet.
    setTimeout(() => {
      clearTimeout(timerIdRef.current)
      setPressed(false)
      onLongPressEnd?.()
    }, 10)
  }, [])

  // if the user scrolls past the threshold, end the press
  // timerIdRef is set to 0 to short circuit the calculation
  const move = useCallback(() => {
    if (timerIdRef && Math.abs(window.scrollY - scrollStart) > SCROLL_THRESHOLD) {
      if (pressed) {
        onLongPressEnd?.()
      } else {
        clearTimeout(timerIdRef.current)
        timerIdRef.current = 0
      }
    }
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
    onTouchMove: move,
    onTouchCancel: stop,
  }
}

export default useLongPress
