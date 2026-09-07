import React, { useCallback, useState } from 'react'
import { useDispatch } from 'react-redux'
import DragThoughtZone from '../@types/DragThoughtZone'
import SimplePath from '../@types/SimplePath'
import { alertActionCreator as alert } from '../actions/alert'
import { longPressActionCreator as longPress } from '../actions/longPress'
import { toggleMulticursorActionCreator as toggleMulticursor } from '../actions/toggleMulticursor'
import { AlertType, LongPressState } from '../constants'
import hasMulticursor from '../selectors/hasMulticursor'
import debugLog from '../util/debugLog'
import isCommandKey from '../util/isCommandKey'
import useLongPress from './useLongPress'

/** Adds event handlers to detect long press and set state.longPress while the user is long pressing a thought in preparation for a drag. */
const useDragHold = ({
  disabled,
  simplePath,
  sourceZone,
  toggleMulticursorOnLongPress,
}: {
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
  const onLongPressEnd = useCallback(
    (e?: React.MouseEvent | React.TouchEvent) => {
      if (disabled) return

      setIsPressed(false)

      // Shift + Click and Cmd/Ctrl + Click are handled by the click handler in Thought, which fires before the long press ends.
      // Toggling the multicursor here as well would undo the selection that the click handler just made.
      const multiselectModifier = !!e && (e.shiftKey || isCommandKey(e))

      // touchcancel means the system claimed the touch, e.g. when the user swipes up from the bottom edge of the screen to switch apps on iOS. The page sees a touchstart with no touchmove, so the press outlasts the long press timer. A cancelled press is not a deliberate release, so it must not activate the multiselect, which would open the Command Center.
      const cancelled = e?.type === 'touchcancel'

      dispatch((dispatch, getState) => {
        const state = getState()

        // Log how the press ended so that a false multiselect, e.g. an OS app switcher swipe misread as a long press, can be diagnosed from the debug log. eventType distinguishes a deliberate release (touchend) from a system-claimed touch (touchcancel).
        debugLog.log('longPressEnd', {
          eventType: e?.type ?? null,
          dragHold: state.longPress === LongPressState.DragHold,
        })

        if (state.longPress === LongPressState.DragHold) {
          if (!hasMulticursor(state)) dispatch(alert(null))
          if (toggleMulticursorOnLongPress && !multiselectModifier && !cancelled)
            dispatch(toggleMulticursor({ path: simplePath }))
        }

        dispatch([
          state.alert?.alertType === AlertType.DragAndDropHint ? alert(null) : null,
          longPress({ value: LongPressState.Inactive }),
        ])
      })
    },
    [disabled, dispatch, simplePath, toggleMulticursorOnLongPress],
  )

  const props = useLongPress(onLongPressStart, onLongPressEnd)

  return {
    isPressed,
    props,
  }
}

export default useDragHold
