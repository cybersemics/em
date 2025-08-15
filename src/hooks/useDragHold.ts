import { useCallback, useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import DragThoughtZone from '../@types/DragThoughtZone'
import SimplePath from '../@types/SimplePath'
import { alertActionCreator as alert } from '../actions/alert'
import { clearMulticursorsActionCreator as clearMulticursors } from '../actions/clearMulticursors'
import { longPressActionCreator as longPress } from '../actions/longPress'
import { toggleMulticursorActionCreator as toggleMulticursor } from '../actions/toggleMulticursor'
import { LongPressState } from '../constants'
import allowTouchToScroll from '../device/allowTouchToScroll'
import hasMulticursor from '../selectors/hasMulticursor'
import longPressStore from '../stores/longPressStore'
import useLongPress from './useLongPress'

/** Adds event handlers to detect long press and set state.dragHold while the user is long pressing a thought in preparation for a drag. */
const useDragHold = ({
  isDragging,
  disabled,
  simplePath,
  sourceZone,
  toggleMulticursorOnLongPress,
}: {
  isDragging: boolean
  disabled?: boolean
  toggleMulticursorOnLongPress?: boolean
  simplePath: SimplePath
  sourceZone: DragThoughtZone
}) => {
  // Set .pressed so that user-select: none can be applied to disable long press to select on iOS. If user-select: none is added after touchstart, it does not prevent magnifying glass text selection (unresolved). -webkit-touch-callout does not help. It seems the only way to disable it fully is to preventDefault on touchstart. However, this would break navigation when keyboard is open.
  // See: https://stackoverflow.com/questions/923782/disable-the-text-highlighting-magnifier-on-touch-hold-on-mobile-safari-webkit
  const [isPressed, setIsPressed] = useState(false)
  const dispatch = useDispatch()

  /** Highlight bullet and show alert on long press on Thought. */
  const onLongPressStart = useCallback(() => {
    if (disabled) return
    setIsPressed(true)

    // react-dnd-touch-backend will call preventDefault on touchmove events once a drag has begun, but since there is a touchSlop threshold of 10px,
    // we can get iOS Safari to initiate a scroll before drag-and-drop begins. It is then impossible to cancel the scroll programatically. (#3141)
    // Calling preventDefault on all touchmove events blocks scrolling entirely, but calling it once long press begins can prevent buggy behavior.
    allowTouchToScroll(false)
    dispatch(longPress({ value: LongPressState.DragHold, simplePath, sourceZone }))
  }, [disabled, dispatch, simplePath, sourceZone])

  /** Cancel highlighting of bullet and dismiss alert when long press finished. */
  const onLongPressEnd = useCallback(() => {
    if (disabled) return

    setIsPressed(false)

    // Once the long press ends, we can allow touchmove events to cause scrolling again. If drag-and-drop has begun, then this will not fire,
    // but endDrag in useDragAndDropThought will happen instead.
    allowTouchToScroll(true)
    dispatch((dispatch, getState) => {
      const state = getState()

      if (state.longPress === LongPressState.DragHold && !hasMulticursor(state)) {
        dispatch(alert(null))
        if (toggleMulticursorOnLongPress) dispatch(toggleMulticursor({ path: simplePath }))
      }

      dispatch(longPress({ value: LongPressState.Inactive }))
    })
  }, [disabled, dispatch, simplePath, toggleMulticursorOnLongPress])

  // react-dnd stops propagation so onLongPressEnd sometimes doesn't get called.
  // Therefore, disable isPressed as soon as we are dragging.
  useEffect(() => {
    dispatch((dispatch, getState) => {
      const state = getState()

      if (isDragging || state.longPress === LongPressState.DragHold) {
        setIsPressed(false)
        dispatch([alert(null)])

        if (hasMulticursor(state)) {
          dispatch(clearMulticursors())
        }
      }
      // If we were dragging but now we're not, make sure to reset the lock
      if (!isDragging && state.longPress === LongPressState.DragHold) {
        // Reset the lock to allow immediate long press after drag ends
        longPressStore.unlock()
      }
    })
  }, [dispatch, isDragging])

  const props = useLongPress(onLongPressStart, onLongPressEnd)

  return {
    isPressed,
    props,
  }
}

export default useDragHold
