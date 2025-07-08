import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDragDropManager } from 'react-dnd'
import { useDispatch } from 'react-redux'
import { keyboardOpenActionCreator as keyboardOpen } from '../actions/keyboardOpen'
import { isTouch } from '../browser'
import { TIMEOUT_LONG_PRESS_THOUGHT, noop } from '../constants'
import * as selection from '../device/selection'
import globals from '../globals'
import longPressStore from '../stores/longPressStore'
import haptics from '../util/haptics'

// number of pixels of scrolling to allow before abandoning the long tap
const SCROLL_THRESHOLD = 10

/** Custom hook to manage long press.
 * The onLongPressStart handler is called after the delay if the user is still pressing.
 * The onLongPressEnd handler is called when the long press ends, either by the user lifting their finger (touchend, mouseup) or by the user moving their finger (touchmove, touchcancel, mousemove).
 **/
const useLongPress = (
  onLongPressStart: (() => void) | null = noop,
  onLongPressEnd: ((options: { canceled: boolean }) => void) | null = noop,
  delay: number = TIMEOUT_LONG_PRESS_THOUGHT,
) => {
  const [pressing, setPressing] = useState(false)
  const [pressed, setPressed] = useState(false)
  // Track isLocked state from longPressStore in local state
  const isLocked = longPressStore.useSelector(state => state.isLocked)
  // useState doesn't work for some reason (???)
  // scrollY variable is always 0 in onPressed
  const clientCoords = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const timerIdRef = useRef<number | undefined>()
  const dispatch = useDispatch()
  const unmounted = useRef(false)
  const dragDropManager = useDragDropManager()

  useEffect(() => {
    const backend = dragDropManager.getBackend() as any
    const onStart = (e: React.TouchEvent) => {
      if (isLocked || !pressing) return

      if ('touches' in e) {
        clientCoords.current = { x: e.touches?.[0]?.clientX, y: e.touches?.[0]?.clientY }
      }

      clearTimeout(timerIdRef.current)
      /** Starts the timer. Unless it is cleared by stop or unmount, it will set pressed and call onLongPressStart after the delay. */
      // cast Timeout to number for compatibility with clearTimeout
      timerIdRef.current = setTimeout(() => {
        globals.longpressing = true
        haptics.light()
        onLongPressStart?.()
        longPressStore.lock()
        if (!unmounted.current) {
          setPressed(true)
        }
      }, delay) as unknown as number
    }

    /** Let the react-dnd 'start' event begin the timer so that there is no gap between the beginning of a long press
     *  and the initialization of the drag functionality. (#3072, #3073) */
    backend.addEventListener(backend.options.rootElement, 'start', onStart)

    return () => {
      backend.removeEventListener(backend.options.rootElement, 'start', onStart)
      clearTimeout(timerIdRef.current)
    }
  }, [dragDropManager, pressing])

  /** On mouseDown or touchStart, mark that the press has begun so that when the 'start' event fires in react-dnd,
   * we will know which element is being long-pressed. */
  const start = useCallback((e: React.MouseEvent | React.TouchEvent) => setPressing(true), [setPressing])

  // track that long press has stopped on mouseUp, touchEnd, or touchCancel
  // Note: This method is not guaranteed to be called, so make sure you perform any cleanup from onLongPressStart elsewhere (e.g. in useDragHold.)
  // TODO: Maybe an unmount handler would be better?
  const stop = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      setPressing(false)
      // Delay setPressed(false) to ensure that onLongPressEnd is not called until bubbled events complete.
      // This gives other components a chance to short circuit.
      // We can't stop propagation here without messing up other components like Bullet.
      setTimeout(() => {
        clearTimeout(timerIdRef.current)
        timerIdRef.current = 0
        longPressStore.unlock()

        // If not longpressing, it means that the long press was canceled by a move event.
        // in this case, onLongPressEnd should not be called, since it was already called by the move event.
        if (!globals.longpressing) return

        globals.longpressing = false

        // If a long press occurred, mark it as not canceled
        onLongPressEnd?.({ canceled: false })

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
    (e: React.TouchEvent) => {
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
          globals.longpressing = false
          onLongPressEnd?.({ canceled: true })
        }
      }
    },
    [onLongPressEnd, pressed],
  )

  // Prevent context menu from appearing on long press, otherwise it interferes with drag-and-drop.
  // Allow double tap to open the context menu as usual.
  // Android passes React.PointerEvent
  // Web passes React.MouseEvent
  const onContextMenu = useCallback(
    (e: React.MouseEvent | React.PointerEvent) => {
      // On Android, double tap activation of context menu produces a pointerType of `mouse` whereas long press produces `touch`
      if ('pointerType' in e.nativeEvent && e.nativeEvent.pointerType === 'touch') {
        e.preventDefault()
        e.stopPropagation()
        selection.clear()
        dispatch(keyboardOpen({ value: false }))
      }
    },
    [dispatch],
  )

  // unlock on unmount
  // this may have a race condition if start is activated on another component right before this is unmounting, but it seems unlikely
  useEffect(() => {
    return () => {
      unmounted.current = true
      longPressStore.unlock()
    }
  }, [])

  const props = useMemo(
    () => ({
      // disable Android context menu
      // does not work to prevent iOS long press to select behavior
      onContextMenu,
      // mousedown and mouseup can trigger on mobile when long tapping on the thought outside the editable, so make sure to only register touch handlers
      onMouseDown: !isTouch ? start : undefined,
      onMouseUp: !isTouch ? stop : undefined,
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
