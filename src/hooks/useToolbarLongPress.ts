import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch } from 'react-redux'
import DragShortcutZone from '../@types/DragShortcutZone'
import Shortcut from '../@types/Shortcut'
import { alertActionCreator as alert } from '../actions/alert'
import { toolbarLongPressActionCreator as toolbarLongPress } from '../actions/toolbarLongPress'
import { TIMEOUT_LONG_PRESS_THOUGHT } from '../constants'
import useLongPress from './useLongPress'

/** Set state.toolbarLongPress when long pressing a toolbar button in the customize modal. */
const useToolbarLongPress = ({
  disabled,
  isDragging,
  shortcut,
  sourceZone,
}: {
  disabled: boolean
  isDragging: boolean
  shortcut: Shortcut
  sourceZone: DragShortcutZone
}) => {
  // Set .pressed so that user-select: none can be applied to disable long press to select on iOS. If user-select: none is added after touchstart, it does not prevent magnifying glass text selection (unresolved). -webkit-touch-callout does not help. It seems the only way to disable it fully is to preventDefault on touchstart. However, this would break navigation in edit mode.
  // See: https://stackoverflow.com/questions/923782/disable-the-text-highlighting-magnifier-on-touch-hold-on-mobile-safari-webkit
  const [isPressed, setIsPressed] = useState(false)
  const dispatch = useDispatch()

  /** Turn on isPressed and dispatch toolbarLongPress when the long press starts. */
  const onLongPressStart = useCallback(() => {
    if (disabled) return
    setIsPressed(true)
    dispatch(toolbarLongPress({ shortcut, sourceZone }))
  }, [disabled, dispatch, shortcut, sourceZone])

  /** Turn off isPressed and dismiss an alert when long press ends. */
  const onLongPressEnd = useCallback(() => {
    if (disabled) return
    setIsPressed(false)
    dispatch((dispatch, getState) => {
      if (getState().dragHold) {
        dispatch([toolbarLongPress({ shortcut: null }), alert(null)])
      }
    })
  }, [disabled, dispatch])

  // react-dnd stops propagation so onLongPressEnd sometimes does't get called
  // so disable toolbarLongPress and isPressed as soon as we are dragging
  // or if no longer dragging and toolbarLongPress never got cleared.
  //
  useEffect(() => {
    dispatch((dispatch, getState) => {
      if (isDragging || getState().toolbarLongPress) {
        setIsPressed(false)
        dispatch(toolbarLongPress({ shortcut: null }))
      }
    })
  }, [dispatch, isDragging])

  const props = useLongPress(onLongPressStart, onLongPressEnd, null, TIMEOUT_LONG_PRESS_THOUGHT)

  const result = useMemo(
    () => ({
      isPressed,
      props,
    }),
    [isPressed, props],
  )

  return result
}

export default useToolbarLongPress
