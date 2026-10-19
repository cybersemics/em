import { FC, PropsWithChildren, useEffect } from 'react'
import { DndProvider, useDragDropManager } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { TouchBackend } from 'react-dnd-touch-backend'
import { useDispatch } from 'react-redux'
import { alertActionCreator as alert } from '../actions/alert'
import { longPressActionCreator as longPress } from '../actions/longPress'
import { isTouch } from '../browser'
import { AlertType, LongPressState, TIMEOUT_LONG_PRESS_THOUGHT, TOUCH_SLOP } from '../constants'
import allowTouchToScroll from '../device/allowTouchToScroll'
import touchStore from '../stores/touchStore'
import debugLog from '../util/debugLog'

/** How long after the last finger lifts the drag is expected to have ended on its own. Every ending the app performs completes well within it: useLongPress defers its end by 10 ms, the touch backend's pointerup fallback by one task, and endDrag ends synchronously. It must also stay below TIMEOUT_LONG_PRESS_THOUGHT, so that a press begun by the touch that triggered the check cannot have entered DragHold before the check runs. */
const RELEASE_GRACE = 100

/**
 * Ends drag and drop once no finger is on the screen, whatever left it active (#5895). Long press and drag each end on
 * their own release signal: the pressed thought's touchend, or the touch backend's touchend and pointerup. A signal
 * can miss them. The thought the touch landed on can be removed from the DOM mid-press, which dispatches its touchend
 * into the detached tree, and a press can end before the drag that grew from it has a source to end. Rather than
 * patching each path, this enforces the invariant directly: shortly after the last finger lifts, or a new single touch
 * proves that it did, anything still active belongs to a touch that is over. It is cancelled, not dropped and not
 * selected, since the release that would have decided either was never seen.
 */
const EndDragOnRelease: FC = () => {
  const dispatch = useDispatch()
  const manager = useDragDropManager()

  useEffect(() => {
    /** Touch pointers currently down, for releases that reach the window only as a pointerup. */
    const pointersDown = new Set<number>()
    /** The number of fingers down as of the latest touch event, so that a check can tell whether one is down now. */
    let fingersDown = 0
    let timer = 0

    /** Cancels any long press or drag that outlived its touch. */
    const endOrphanedDrag = () =>
      dispatch((dispatch, getState) => {
        const state = getState()
        if (state.longPress === LongPressState.Inactive) return

        debugLog.log('dragOutlivedTouch', { longPress: state.longPress, fingersDown })

        // react-dnd calls the source's end handler, which restores scrolling and resets longPress
        const monitor = manager.getMonitor()
        if (monitor.isDragging()) manager.getActions().endDrag()

        allowTouchToScroll(true)
        dispatch([
          state.alert?.alertType === AlertType.DragAndDropHint ? alert(null) : null,
          longPress({ value: LongPressState.Inactive }),
        ])

        // endDrag suppresses the cursor events of the touch that just ended, but when a new touch is what proved the
        // old one over, the events to come belong to that new touch.
        if (fingersDown > 0) touchStore.update({ suppressCursorAfterTouch: false })
      })

    /** Schedules the check, replacing one already pending, since every trigger proves the same thing. */
    const scheduleCheck = () => {
      clearTimeout(timer)
      timer = window.setTimeout(endOrphanedDrag, RELEASE_GRACE)
    }

    /** A single finger landing means every earlier finger has lifted, including one whose release never arrived. */
    const onTouchStart = (e: TouchEvent) => {
      fingersDown = e.touches.length
      if (e.touches.length === 1) scheduleCheck()
    }

    /** Checks once the last finger lifts. */
    const onTouchEnd = (e: TouchEvent) => {
      fingersDown = e.touches.length
      if (e.touches.length === 0) scheduleCheck()
    }

    /** Tracks touch pointers, since only pointer events reach the window once the touched element has been removed. */
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') pointersDown.add(e.pointerId)
    }

    /** Checks once the last touch pointer lifts. */
    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return
      pointersDown.delete(e.pointerId)
      if (pointersDown.size === 0) scheduleCheck()
    }

    // capture, so that a handler that stops propagation cannot hide the release
    const options = { capture: true, passive: true }
    window.addEventListener('touchstart', onTouchStart, options)
    window.addEventListener('touchend', onTouchEnd, options)
    window.addEventListener('touchcancel', onTouchEnd, options)
    window.addEventListener('pointerdown', onPointerDown, options)
    window.addEventListener('pointerup', onPointerUp, options)
    window.addEventListener('pointercancel', onPointerUp, options)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('touchstart', onTouchStart, options)
      window.removeEventListener('touchend', onTouchEnd, options)
      window.removeEventListener('touchcancel', onTouchEnd, options)
      window.removeEventListener('pointerdown', onPointerDown, options)
      window.removeEventListener('pointerup', onPointerUp, options)
      window.removeEventListener('pointercancel', onPointerUp, options)
    }
  }, [dispatch, manager])

  return null
}

/** Drag and Drop Provider HOC. */
const DragAndDropContext: FC<PropsWithChildren> = ({ children }) => (
  <DndProvider
    backend={isTouch ? TouchBackend : HTML5Backend}
    options={{ delayTouchStart: TIMEOUT_LONG_PRESS_THOUGHT, preview: true, touchSlop: TOUCH_SLOP }}
  >
    <EndDragOnRelease />
    {children}
  </DndProvider>
)

export default DragAndDropContext
