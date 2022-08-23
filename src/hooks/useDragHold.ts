import { useCallback, useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import SimplePath from '../@types/SimplePath'
import alert from '../action-creators/alert'
import dragHold from '../action-creators/dragHold'
import { TIMEOUT_LONG_PRESS_THOUGHT } from '../constants'
import useLongPress from './useLongPress'

/** Set state.dragHold on longPress. */
const useDragHold = ({ isDragging, simplePath }: { isDragging: boolean; simplePath: SimplePath }) => {
  // Set .pressed so that user-select: none can be applied to disable long press to select on iOS. If user-select: none is added after touchstart, it does not prevent magnifying glass text selection (unresolved). -webkit-touch-callout does not help. It seems the only way to disable it fully is to preventDefault on touchstart. However, this would break navigation in edit mode.
  // See: https://stackoverflow.com/questions/923782/disable-the-text-highlighting-magnifier-on-touch-hold-on-mobile-safari-webkit
  const [isPressed, setIsPressed] = useState(false)
  const dispatch = useDispatch()

  /** Highlight bullet and show alert on long press on Thought. */
  const onLongPressStart = useCallback(() => {
    setIsPressed(true)
    dispatch(dragHold({ value: true, simplePath }))
  }, [])

  /** Cancel highlighting of bullet and dismiss alert when long press finished. */
  const onLongPressEnd = useCallback(() => {
    setIsPressed(false)
    dispatch((dispatch, getState) => {
      if (getState().dragHold) {
        dispatch([dragHold({ value: false }), alert(null)])
      }
    })
  }, [])

  // react-dnd stops propagation so onLongPressEnd sometimes does't get called
  // so disable pressed as soon as we are dragging
  useEffect(() => {
    if (isDragging) {
      setIsPressed(false)
    }
  }, [isDragging])

  const props = useLongPress(onLongPressStart, onLongPressEnd, TIMEOUT_LONG_PRESS_THOUGHT)

  return {
    isPressed,
    props,
  }
}

export default useDragHold
