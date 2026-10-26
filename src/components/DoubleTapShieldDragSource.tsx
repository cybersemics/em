import { useEffect, useRef } from 'react'
import { useDrag } from 'react-dnd'
import { useSelector } from 'react-redux'
import DragAndDropType from '../@types/DragAndDropType'
import DragThoughtItem from '../@types/DragThoughtItem'
import { LongPressState } from '../constants'
import doubleTapShield from '../device/doubleTapShield'

/** The drag target registered by the thought beneath a press on the overlay. */
type DragTarget = NonNullable<NonNullable<ReturnType<typeof doubleTapShield.dragTargets.get>>['current']>

/** Makes the double tap overlay a drag source, so that a long press that begins on it drags the thought beneath it, as it would without the overlay. Each press borrows the drag spec and long press handlers that the thought registered in doubleTapShield.dragTargets. */
const DoubleTapShieldDragSource = () => {
  const overlay = doubleTapShield.shieldStore.useSelector(state => state.overlay)
  const dragInProgress = useSelector(state => state.longPress === LongPressState.DragInProgress)
  const targetRef = useRef<DragTarget | null>(null)

  const [, dragSource] = useDrag({
    type: DragAndDropType.Thought,
    canDrag: () => !!targetRef.current?.drag.canDrag(),
    item: () => targetRef.current?.drag.item() ?? [],
    end: (item: DragThoughtItem[], monitor) => targetRef.current?.drag.end(item, monitor),
  })

  useEffect(() => {
    if (!overlay) return

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
      targetRef.current?.longPress.onTouchStart(e)
    }
    /** Ends the long press. */
    const onTouchEnd = (e: TouchEvent) => targetRef.current?.longPress.onTouchEnd(e)
    /** Cancels the long press. */
    const onTouchCancel = (e: TouchEvent) => targetRef.current?.longPress.onTouchCancel(e)

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

export default DoubleTapShieldDragSource
