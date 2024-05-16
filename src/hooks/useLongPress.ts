import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch } from 'react-redux'
import { editingActionCreator as editing } from '../actions/editing'
import { isTouch } from '../browser'
import { noop } from '../constants'
import * as selection from '../device/selection'
import globals from '../globals'

// number of pixels of scrolling to allow before abandoning the long tap
const SCROLL_THRESHOLD = 10

// only one component can be pressed at a time
// use a global lock since stopPropagation breaks MultiGesture
let lock = false

/** Custom hook to manage long press. */
const useLongPress = (
  onLongPressStart: (() => void) | null = noop,
  onLongPressEnd: (() => void) | null = noop,
  onTouchStart: (() => void) | null = noop,
  ms = 250,
) => {
  const [pressed, setPressed] = useState(false)
  // useState doesn't work for some reason (???)
  // scrollY variable is always 0 in onPressed
  const clientCoords = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const timerIdRef = useRef<number | undefined>()
  const dispatch = useDispatch()
  const unmounted = useRef(false)

  /** Starts the timer. Unless it is cleared by stop or unmount, it will set pressed and call onLongPressStart after the delay. */
  // track that long press has started on mouseDown or touchStart
  const start = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      // do not stop propagation, or it will break MultiGesture
      if (lock) return

      if ('touches' in e) {
        clientCoords.current = { x: e.touches?.[0]?.clientX, y: e.touches?.[0]?.clientY }
      }
      onTouchStart?.()

      // cast Timeout to number for compatibility with clearTimeout
      clearTimeout(timerIdRef.current)
      timerIdRef.current = setTimeout(() => {
        globals.longpressing = true
        onLongPressStart?.()
        lock = true
        if (!unmounted.current) {
          setPressed(true)
        }
      }, ms) as unknown as number
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      // TODO: Find a better way than adding an extraneous dependency
      lock,
      ms,
      onLongPressStart,
      onTouchStart,
    ],
  )

  // track that long press has stopped on mouseUp, touchEnd, or touchCancel
  // Note: This method is not guaranteed to be called, so make sure you perform any cleanup from onLongPressStart elsewhere (e.g. in useDragHold.
  // TODO: Maybe an unmount handler would be better?
  const stop = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      // Delay setPressed(false) to ensure that onLongPressEnd is not called until bubbled events complete.
      // This gives other components a chance to short circuit.
      // We can't stop propagation here without messing up other components like Bullet.
      setTimeout(() => {
        clearTimeout(timerIdRef.current)
        timerIdRef.current = 0
        lock = false
        globals.longpressing = false
        onLongPressEnd?.()
        if (!unmounted.current) {
          setPressed(false)
        }
      }, 10)
    },
    [onLongPressEnd],
  )

  // If the user moves, end the press.
  // If timerIdRef is set to 0, abort to prevent unnecessary calculations.
  const move = useCallback(
    e => {
      if (!timerIdRef.current) return
      const moveCoords = { x: e.touches?.[0]?.clientX, y: e.touches?.[0]?.clientY }
      if (
        Math.abs(moveCoords.x - clientCoords.current.x) > SCROLL_THRESHOLD ||
        Math.abs(moveCoords.y - clientCoords.current.y) > SCROLL_THRESHOLD
      ) {
        clearTimeout(timerIdRef.current)
        timerIdRef.current = 0
        clientCoords.current = { x: 0, y: 0 }
        if (pressed) {
          onLongPressEnd?.()
        }
      }
    },
    [onLongPressEnd, pressed],
  )

  // Android passes React.PointerEvent
  // Web passes React.MouseEvent
  const onContextMenu = useCallback(
    (e: React.MouseEvent | React.PointerEvent) => {
      // Double tap activation of context menu produces a pointerType of `touch` whereas long press activation of context menu produces pointer type of `mouse`
      if (!isTouch || ('pointerType' in e.nativeEvent && e.nativeEvent.pointerType === 'touch')) {
        e.preventDefault()
        e.stopPropagation()
        selection.clear()
        dispatch(editing({ value: false }))
      }
    },
    [dispatch],
  )

  // unlock on unmount
  // this may have a race condition if start is activated on another component right before this is unmounting, but it seems unlikely
  useEffect(() => {
    return () => {
      unmounted.current = true
      lock = false
    }
  }, [])

  const props = useMemo(
    () => ({
      // disable Android context menu
      // does not work to prevent iOS long press to select behavior
      onContextMenu,
      onMouseDown: start,
      onMouseUp: stop,
      onTouchStart: start,
      onTouchEnd: stop,
      onTouchMove: move,
      onTouchCancel: stop,
    }),
    [move, onContextMenu, start, stop],
  )

  return props
}

export default useLongPress
