import { useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch } from 'react-redux'
import DragThoughtZone from '../@types/DragThoughtZone'
import SimplePath from '../@types/SimplePath'
import { alertActionCreator as alert } from '../actions/alert'
import { clearMulticursorsActionCreator as clearMulticursors } from '../actions/clearMulticursors'
import { dragHoldActionCreator as dragHold } from '../actions/dragHold'
import { toggleMulticursorActionCreator as toggleMulticursor } from '../actions/toggleMulticursor'
import { TIMEOUT_LONG_PRESS_THOUGHT } from '../constants'
import hasMulticursor from '../selectors/hasMulticursor'
import useLongPress from './useLongPress'

/** Set state.dragHold on longPress. */
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
  // Set .pressed so that user-select: none can be applied to disable long press to select on iOS. If user-select: none is added after touchstart, it does not prevent magnifying glass text selection (unresolved). -webkit-touch-callout does not help. It seems the only way to disable it fully is to preventDefault on touchstart. However, this would break navigation in edit mode.
  // See: https://stackoverflow.com/questions/923782/disable-the-text-highlighting-magnifier-on-touch-hold-on-mobile-safari-webkit
  const [isPressed, setIsPressed] = useState(false)
  const dispatch = useDispatch()
  // keep track of whether the drag moved; use true by default to prevent false positive onLongPressEnd calls
  const didMove = useRef(true)

  /** Highlight bullet and show alert on long press on Thought. */
  const onLongPressStart = useCallback(
    () => {
      if (disabled) return
      didMove.current = false
      setIsPressed(true)
      dispatch(dragHold({ value: true, simplePath, sourceZone }))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  /** Cancel highlighting of bullet and dismiss alert when long press finished. */
  const onLongPressEnd = useCallback(
    () => {
      if (disabled) return

      setIsPressed(false)
      dispatch((dispatch, getState) => {
        if (getState().dragHold) {
          dispatch([dragHold({ value: false }), alert(null)])
        }
      })

      // the user did not move the thought, toggle the multicursor
      if (!didMove.current && toggleMulticursorOnLongPress) {
        didMove.current = true
        dispatch(toggleMulticursor({ path: simplePath }))
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  // react-dnd stops propagation so onLongPressEnd sometimes does't get called
  // so disable dragHold and isPressed as soon as we are dragging
  // or if no longer dragging and dragHold never got cleared.
  useEffect(() => {
    // track that the drag actually moved
    if (isDragging) {
      didMove.current = true
    }

    dispatch((dispatch, getState) => {
      const state = getState()

      if (isDragging || state.dragHold) {
        setIsPressed(false)
        dispatch([dragHold({ value: false }), alert(null)])

        if (hasMulticursor(state)) {
          dispatch(clearMulticursors())
        }
      }
    })
  }, [dispatch, isDragging])

  const props = useLongPress(onLongPressStart, onLongPressEnd, null, TIMEOUT_LONG_PRESS_THOUGHT)

  return {
    isPressed,
    props,
  }
}

export default useDragHold
