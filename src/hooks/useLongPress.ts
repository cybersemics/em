import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDragDropManager } from 'react-dnd'
import { useDispatch } from 'react-redux'
import { keyboardOpenActionCreator as keyboardOpen } from '../actions/keyboardOpen'
import { isTouch } from '../browser'
import { TIMEOUT_LONG_PRESS_THOUGHT, noop } from '../constants'
import * as selection from '../device/selection'
import globals from '../globals'
import store from '../stores/app'
import longPressStore from '../stores/longPressStore'
import haptics from '../util/haptics'

/** Custom hook to manage long press.
 * The onLongPressStart handler is called after the delay if the user is still pressing.
 * The onLongPressEnd handler is called when the long press ends, either by the user lifting their finger (touchend, mouseup) or by the user moving their finger (touchmove, touchcancel, mousemove).
 **/
const useLongPress = (
  onLongPressStart: (() => void) | null = noop,
  onLongPressEnd: (() => void) | null = noop,
  delay: number = TIMEOUT_LONG_PRESS_THOUGHT,
) => {
  const [pressing, setPressing] = useState(false)
  // Track isLocked state from longPressStore in local state
  const isLocked = longPressStore.useSelector(state => state.isLocked)
  const timerIdRef = useRef<number | undefined>()
  const dispatch = useDispatch()
  const unmounted = useRef(false)
  const dragDropManager = useDragDropManager()

  // The stop handler below does not run when drag-and-drop is active.
  // Also, endDrag in useDragAndDropThought unlocks the longPressStore before it does anything else.
  // Unless it is prevented from doing so, the main effect below this one will re-run when isLocked changes to false,
  // but pressing is still true, triggering onStart again.
  useEffect(() => {
    if (!isLocked) setPressing(false)
  }, [isLocked, setPressing])

  useEffect(() => {
    /** Begin a long press, after the timer elapses on desktop, or the dragStart event is fired by TouchBackned in react-dnd. */
    const onStart = () => {
      const { isScrolling } = store.getState()
      if (isLocked || !pressing || isScrolling) return

      globals.longpressing = true
      haptics.light()
      onLongPressStart?.()
      longPressStore.lock()
    }

    if (isTouch) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const backend = dragDropManager.getBackend() as any
      /** On mobile devices, let TouchBackend manage the timer and wait for it to fire a dragStart event. */
      backend.options.rootElement.addEventListener('dragStart', onStart)

      return () => backend.options.rootElement.removeEventListener('dragStart', onStart)
    } else {
      clearTimeout(timerIdRef.current)
      /** Starts the timer. Unless it is cleared by stop or unmount, it will set pressed and call onLongPressStart after the delay. */
      // cast Timeout to number for compatibility with clearTimeout
      timerIdRef.current = setTimeout(onStart, delay) as unknown as number

      return () => clearTimeout(timerIdRef.current)
    }
  }, [delay, dragDropManager, isLocked, onLongPressStart, pressing])

  /** On mouseDown or touchStart, mark that the press has begun so that when the 'start' event fires in react-dnd,
   * we will know which element is being long-pressed. */
  const start = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (e.nativeEvent instanceof TouchEvent || e.nativeEvent.button !== 2) setPressing(true)
    },
    [setPressing],
  )

  // track that long press has stopped on mouseUp, touchEnd, or touchCancel
  // Note: This method is not guaranteed to be called, so make sure you perform any cleanup from onLongPressStart elsewhere (e.g. in useDragHold.)
  // TODO: Maybe an unmount handler would be better?
  const stop = useCallback(() => {
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
      onLongPressEnd?.()
    }, 10)
  }, [onLongPressEnd, setPressing])

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
      onTouchCancel: stop,
    }),
    [onContextMenu, start, stop],
  )

  return props
}

export default useLongPress
