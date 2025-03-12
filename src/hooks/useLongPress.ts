import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch } from 'react-redux'
import { editingActionCreator as editing } from '../actions/editing'
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
) => {
  const [pressed, setPressed] = useState(false)
  // useState doesn't work for some reason (???)
  // scrollY variable is always 0 in onPressed
  const clientCoords = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const timerIdRef = useRef<number | undefined>()
  const dispatch = useDispatch()
  const unmounted = useRef(false)
  const onLongPressEndRef = useRef(onLongPressEnd)
  const wasLongPressingRef = useRef(false) // Track if a long press was actually started

  // Keep the callback reference updated
  useEffect(() => {
    onLongPressEndRef.current = onLongPressEnd
  }, [onLongPressEnd])

  // Subscribe to lock state changes from the store
  // Only subscribe when pressed is true to avoid unnecessary re-renders
  // This is critical for virtualization performance
  useEffect(() => {
    // Only add the subscription when we're actually pressed
    // This prevents all components from re-rendering on global lock state changes
    if (!pressed) return undefined

    // If we were pressed but the lock was released externally (by a drag start)
    // then we need to properly clean up and notify listeners
    return longPressStore.subscribeSelector(
      state => state.isLocked,
      isLocked => {
        if (!isLocked && pressed) {
          // Lock was released while we were still pressed - likely due to drag
          clearTimeout(timerIdRef.current)
          timerIdRef.current = 0

          // Only mark as canceled if we were actually in a long press
          // If the long press was completed (started and now ending), pass canceled=false
          // so that multicursor toggle can occur
          const wasCanceled = !wasLongPressingRef.current
          globals.longpressing = false

          // Important: Call onLongPressEnd with the right canceled state
          onLongPressEndRef.current?.({ canceled: wasCanceled })
          setPressed(false)
          wasLongPressingRef.current = false
        }
      },
    )
  }, [pressed])

  /** Starts the timer. Unless it is cleared by stop or unmount, it will set pressed and call onLongPressStart after the delay. */
  // track that long press has started on mouseDown or touchStart
  const start = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      // do not stop propagation, or it will break MultiGesture

      // do not long press if another component is already pressed
      // do not long press if right-clicking, otherwise right-clicking on a bullet will cause it to get stuck in the pressed state
      if (longPressStore.getState().isLocked || (e.nativeEvent instanceof MouseEvent && e.nativeEvent.button === 2))
        return

      if ('touches' in e) {
        clientCoords.current = { x: e.touches?.[0]?.clientX, y: e.touches?.[0]?.clientY }
      }

      // cast Timeout to number for compatibility with clearTimeout
      clearTimeout(timerIdRef.current)
      timerIdRef.current = setTimeout(() => {
        globals.longpressing = true
        wasLongPressingRef.current = true // Mark that a long press was started
        longPressStore.actions.setLongPressing(true)
        haptics.light()
        onLongPressStart?.()
        longPressStore.actions.lock()
        if (!unmounted.current) {
          setPressed(true)
        }
      }, TIMEOUT_LONG_PRESS_THOUGHT) as unknown as number
    },
    [onLongPressStart],
  )

  // track that long press has stopped on mouseUp, touchEnd, or touchCancel
  // Note: This method is not guaranteed to be called, so make sure you perform any cleanup from onLongPressStart elsewhere (e.g. in useDragHold.)
  // TODO: Maybe an unmount handler would be better?
  const stop = useCallback(
    (e?: React.MouseEvent | React.TouchEvent) => {
      // Delay setPressed(false) to ensure that onLongPressEnd is not called until bubbled events complete.
      // This gives other components a chance to short circuit.
      // We can't stop propagation here without messing up other components like Bullet.
      setTimeout(() => {
        clearTimeout(timerIdRef.current)
        timerIdRef.current = 0
        longPressStore.actions.unlock()

        // If not longpressing, it means that the long press was canceled by a move event.
        // in this case, onLongPressEnd should not be called, since it was already called by the move event.
        if (!globals.longpressing) return

        globals.longpressing = false
        longPressStore.actions.setLongPressing(false)

        // If a long press occurred, mark it as not canceled
        onLongPressEnd?.({ canceled: false })

        if (!unmounted.current) {
          setPressed(false)
        }
        wasLongPressingRef.current = false // Reset the long press state
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
          longPressStore.actions.setLongPressing(false)
          onLongPressEnd?.({ canceled: true })
          wasLongPressingRef.current = false // Reset the long press state
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
      if (pressed) {
        longPressStore.actions.unlock()
      }
      wasLongPressingRef.current = false // Reset the long press state
    }
  }, [pressed])

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
