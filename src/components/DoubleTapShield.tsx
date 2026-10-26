import { useEffect, useRef } from 'react'
import { useDrag } from 'react-dnd'
import { useDispatch, useSelector } from 'react-redux'
import DragAndDropType from '../@types/DragAndDropType'
import DragThoughtItem from '../@types/DragThoughtItem'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import { LongPressState } from '../constants'
import doubleTapShield from '../device/doubleTapShield'
import getCaretOffset from '../device/getCaretOffset'
import * as selection from '../device/selection'
import hasMulticursor from '../selectors/hasMulticursor'
import isMultiEditing from '../selectors/isMultiEditing'
import isMulticursorPath from '../selectors/isMulticursorPath'
import multitouchStore from '../stores/multitouchStore'
import touchStore from '../stores/touchStore'

/** The drag target registered by the thought beneath a press on the overlay. */
type DragTarget = NonNullable<NonNullable<ReturnType<typeof doubleTapShield.dragTargets.get>>['current']>

/** Passes each tap on a thought or note to doubleTapShield, and makes the double tap overlay a drag source, so that a long press that begins on it drags the thought beneath it, as it would without the overlay. Each press borrows the drag spec and long press handlers that the thought registered in doubleTapShield.dragTargets. */
const DoubleTapShield = () => {
  const dispatch = useDispatch()
  const overlay = doubleTapShield.shieldStore.useSelector(state => state.overlay)
  const dragInProgress = useSelector(state => state.longPress === LongPressState.DragInProgress)
  const targetRef = useRef<DragTarget | null>(null)

  useEffect(() => {
    let touchStart: { clientX: number; clientY: number; timeStamp: number } | null = null

    /** Records where and when the touch began. */
    const onTouchStart = (e: TouchEvent) => {
      const touch = e.changedTouches[0]
      touchStart = touch ? { clientX: touch.clientX, clientY: touch.clientY, timeStamp: e.timeStamp } : null
    }

    /** Passes a touch that ends on a thought or note to the shield, with a callback that places the caret for it. */
    const onTouchEnd = (e: TouchEvent) => {
      const editable =
        e.target instanceof Element
          ? e.target.closest<HTMLElement>('[data-editable], [aria-label="note-editable"]')
          : null
      if (!editable) return

      doubleTapShield.onTouchEnd(e, {
        editable,
        touchStart,
        placeCaret: point =>
          dispatch((dispatch, getState) => {
            const state = getState()
            // Replicates the guards under which useEditMode places a tap's caret, rather than calling into it, so that
            // the shield stays out of useEditMode and can be removed on its own.
            if (
              (hasMulticursor(state) && !isMultiEditing(state)) ||
              multitouchStore.getState() ||
              touchStore.getState().suppressCursorAfterTouch ||
              state.longPress !== LongPressState.Inactive
            ) {
              return false
            }

            const { offset } = getCaretOffset(editable, point)
            if (offset === null) return true
            selection.set(editable, { offset })
            if (editable.hasAttribute('data-editable') && state.cursor) {
              const preserveMulticursor = isMultiEditing(state) && isMulticursorPath(state, state.cursor)
              dispatch(setCursor({ path: state.cursor, offset, preserveMulticursor }))
            }
            return true
          }),
      })
    }

    document.addEventListener('touchstart', onTouchStart)
    document.addEventListener('touchend', onTouchEnd)
    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [dispatch])

  const [, dragSource] = useDrag({
    type: DragAndDropType.Thought,
    canDrag: () => !!targetRef.current?.drag.canDrag(),
    item: () => targetRef.current?.drag.item() ?? [],
    end: (item: DragThoughtItem[], monitor) => targetRef.current?.drag.end(item, monitor),
  })

  useEffect(() => {
    if (!overlay) return

    /** Calls the thought's long press handler with the native event, which has everything useLongPress and useDragHold read from a React one. */
    const callLongPress = (handler: 'onTouchStart' | 'onTouchEnd' | 'onTouchCancel', e: TouchEvent) =>
      (targetRef.current?.longPress[handler] as unknown as ((e: TouchEvent) => void) | undefined)?.(e)

    /** Finds the thought beneath the press and starts its long press. */
    const onTouchStart = (e: TouchEvent) => {
      const touch = e.changedTouches[0]
      const thought = touch
        ? document
            .elementsFromPoint(touch.clientX, touch.clientY)
            .find(el => el !== overlay)
            ?.closest('[aria-label="thought"], [aria-label="bullet"]')
        : null
      targetRef.current = (thought && doubleTapShield.dragTargets.get(thought)?.current) || null
      callLongPress('onTouchStart', e)
    }
    /** Ends the long press. */
    const onTouchEnd = (e: TouchEvent) => callLongPress('onTouchEnd', e)
    /** Cancels the long press. */
    const onTouchCancel = (e: TouchEvent) => callLongPress('onTouchCancel', e)

    dragSource(overlay)
    overlay.addEventListener('touchstart', onTouchStart)
    overlay.addEventListener('touchend', onTouchEnd)
    overlay.addEventListener('touchcancel', onTouchCancel)
    return () => {
      overlay.removeEventListener('touchstart', onTouchStart)
      overlay.removeEventListener('touchend', onTouchEnd)
      overlay.removeEventListener('touchcancel', onTouchCancel)
      dragSource(null)
    }
  }, [dragSource, overlay])

  // TouchBackend finds the drop target under the finger with elementFromPoint, which would otherwise return the overlay.
  // A touch keeps the target it began on, so the touch on the overlay still ends there.
  useEffect(() => {
    if (overlay) overlay.style.pointerEvents = dragInProgress ? 'none' : ''
  }, [dragInProgress, overlay])

  return null
}

export default DoubleTapShield
