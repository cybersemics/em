import { useCallback, useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import DragThoughtZone from '../@types/DragThoughtZone'
import SimplePath from '../@types/SimplePath'
import { alertActionCreator as alert } from '../actions/alert'
import { clearMulticursorsActionCreator as clearMulticursors } from '../actions/clearMulticursors'
import { dragHoldActionCreator as dragHold } from '../actions/dragHold'
import { toggleMulticursorActionCreator as toggleMulticursor } from '../actions/toggleMulticursor'
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
  // Set .pressed so that user-select: none can be applied to disable long press to select on iOS. If user-select: none is added after touchstart, it does not prevent magnifying glass text selection (unresolved). -webkit-touch-callout does not help. It seems the only way to disable it fully is to preventDefault on touchstart. However, this would break navigation in keyboard input mode.
  // See: https://stackoverflow.com/questions/923782/disable-the-text-highlighting-magnifier-on-touch-hold-on-mobile-safari-webkit
  const [isPressed, setIsPressed] = useState(false)
  const dispatch = useDispatch()

  /** Highlight bullet and show alert on long press on Thought. */
  const onLongPressStart = useCallback(() => {
    if (disabled) return
    setIsPressed(true)
    dispatch([dragHold({ value: true, simplePath, sourceZone })])
  }, [disabled, dispatch, simplePath, sourceZone])

  /** Cancel highlighting of bullet and dismiss alert when long press finished. */
  const onLongPressEnd = useCallback(
    ({ canceled }: { canceled: boolean }) => {
      if (disabled) return

      setIsPressed(false)
      dispatch((dispatch, getState) => {
        const state = getState()

        if (state.dragHold) {
          dispatch([dragHold({ value: false }), !hasMulticursor(state) ? alert(null) : null])
        }

        if (!canceled && toggleMulticursorOnLongPress) {
          dispatch(toggleMulticursor({ path: simplePath }))
        }
      })
    },
    [disabled, dispatch, simplePath, toggleMulticursorOnLongPress],
  )

  // react-dnd stops propagation so onLongPressEnd sometimes doesn't get called.
  // Therefore, disable dragHold and isPressed as soon as we are dragging or if no longer dragging and dragHold never got cleared.
  useEffect(() => {
    dispatch((dispatch, getState) => {
      const state = getState()

      if (isDragging || state.dragHold) {
        setIsPressed(false)
        dispatch([dragHold({ value: false }), alert(null)])

        if (hasMulticursor(state)) {
          dispatch(clearMulticursors())
        }
      }
      // If we were dragging but now we're not, make sure to reset the lock
      if (!isDragging && state.dragHold) {
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
