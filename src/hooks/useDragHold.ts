import { useCallback, useState } from 'react'
import { useDispatch } from 'react-redux'
import DragThoughtZone from '../@types/DragThoughtZone'
import SimplePath from '../@types/SimplePath'
import { alertActionCreator as alert } from '../actions/alert'
import { longPressActionCreator as longPress } from '../actions/longPress'
import { toggleMulticursorActionCreator as toggleMulticursor } from '../actions/toggleMulticursor'
import { AlertType, LongPressState } from '../constants'
import hasMulticursor from '../selectors/hasMulticursor'
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
    dispatch(longPress({ value: LongPressState.DragHold, simplePath, sourceZone }))
  }, [disabled, dispatch, simplePath, sourceZone])

  /** Cancel highlighting of bullet and dismiss alert when long press finished. */
  const onLongPressEnd = useCallback(() => {
    if (disabled) return

    setIsPressed(false)

    dispatch((dispatch, getState) => {
      const state = getState()

      if (state.longPress === LongPressState.DragHold) {
        if (!hasMulticursor(state)) dispatch(alert(null))
        if (toggleMulticursorOnLongPress) dispatch(toggleMulticursor({ path: simplePath }))
      }

      dispatch([
        state.alert?.alertType === AlertType.DragAndDropHint ? alert(null) : null,
        longPress({ value: LongPressState.Inactive }),
      ])
    })
  }, [disabled, dispatch, simplePath, toggleMulticursorOnLongPress])

  const props = useLongPress(onLongPressStart, onLongPressEnd)

  return {
    isPressed,
    props,
  }
}

export default useDragHold
