import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDragDropManager } from 'react-dnd'
import { useDispatch } from 'react-redux'
import { useSelector } from 'react-redux'
import { keyboardOpenActionCreator as keyboardOpen } from '../actions/keyboardOpen'
import { isTouch } from '../browser'
import { LongPressState, TIMEOUT_LONG_PRESS_THOUGHT, noop } from '../constants'
import allowTouchToScroll from '../device/allowTouchToScroll'
import * as selection from '../device/selection'
import haptics from '../util/haptics'

export interface LongPressProps {
  onContextMenu: (e: React.MouseEvent | React.PointerEvent) => void
  onDragEnd?: () => void
  onMouseDown?: (e: React.MouseEvent | React.TouchEvent) => void
  onMouseUp?: () => void
  onTouchStart: (e: React.MouseEvent | React.TouchEvent) => void
  onTouchEnd: () => void
  onTouchCancel: () => void
}

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
  const longPressState = useSelector(state => state.longPress)
  const timerIdRef = useRef<number | undefined>(undefined)
  const dispatch = useDispatch()
  const dragDropManager = useDragDropManager()

  useEffect(() => {
    /** Begin a long press, after the timer elapses on desktop, or the dragStart event is fired by TouchBackend in react-dnd. */
    const onStart = () => {
      if (!pressing) return

      // react-dnd-touch-backend will call preventDefault on touchmove events once a drag has begun, but since there is a touchSlop threshold of 10px,
      // we can get iOS Safari to initiate a scroll before drag-and-drop begins. It is then impossible to cancel the scroll programatically. (#3141)
      // Calling preventDefault on all touchmove events blocks scrolling entirely, but calling it once long press begins can prevent buggy behavior.
      allowTouchToScroll(false)

      haptics.light()
      onLongPressStart?.()
    }

    if (isTouch) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const backend = dragDropManager.getBackend() as any
      /** On mobile devices, let TouchBackend manage the timer and wait for it to fire a dragStart event. */
      backend.options.rootElement.addEventListener('dragStart', onStart)

      return () => backend.options.rootElement.removeEventListener('dragStart', onStart)
    } else if (pressing) {
      clearTimeout(timerIdRef.current)
      /** Starts the timer. Unless it is cleared by stop or unmount, it will set pressed and call onLongPressStart after the delay. */
      // cast Timeout to number for compatibility with clearTimeout
      timerIdRef.current = setTimeout(onStart, delay) as unknown as number

      return () => clearTimeout(timerIdRef.current)
    }
  }, [delay, dragDropManager, onLongPressStart, pressing])

  // Desktop can initiate drag-and-drop without waiting for a long press, so the timer does generate an
  // 'Invalid longPress transition' error unless it cleans up the timer. This error doesn't have any effect
  // because no state transition occurs. (#3173)
  useEffect(() => {
    if (pressing && timerIdRef.current && longPressState === LongPressState.DragInProgress) {
      clearTimeout(timerIdRef.current)
    }
  }, [longPressState, pressing])

  /** On mouseDown or touchStart, mark that the press has begun so that when the 'start' event fires in react-dnd,
   * we will know which element is being long-pressed. */
  const start = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if ('touches' in e.nativeEvent || e.nativeEvent.button !== 2) setPressing(true)
    },
    [setPressing],
  )

  // track that long press has stopped on mouseUp, touchEnd, or touchCancel
  // Note: This method is not guaranteed to be called, so make sure you perform any cleanup from onLongPressStart elsewhere (e.g. in useDragHold.)
  // TODO: Maybe an unmount handler would be better?
  const stop = useCallback(() => {
    setPressing(false)

    // Once the long press ends, we can allow touchmove events to cause scrolling again. If drag-and-drop has begun, then this will not fire,
    // but endDrag in useDragAndDropThought will happen instead.
    allowTouchToScroll(true)

    // This gives other components a chance to short circuit.
    // We can't stop propagation here without messing up other components like Bullet.
    setTimeout(() => {
      clearTimeout(timerIdRef.current)
      timerIdRef.current = 0
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

  const props: LongPressProps = useMemo(
    () => ({
      // disable Android context menu
      // does not work to prevent iOS long press to select behavior
      onContextMenu,
      // onMouseUp is not called at the end of a drag, but onDragEnd is called while the long press is still ongoing on mobile (#3173)
      onDragEnd: !isTouch ? stop : undefined,
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
