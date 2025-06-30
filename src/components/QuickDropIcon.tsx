import { FC, useEffect } from 'react'
import { DropTargetMonitor, useDrop } from 'react-dnd'
import { NativeTypes } from 'react-dnd-html5-backend'
import { useDispatch } from 'react-redux'
import { css } from '../../styled-system/css'
import DragAndDropType from '../@types/DragAndDropType'
import DragThoughtItem from '../@types/DragThoughtItem'
import DragThoughtZone from '../@types/DragThoughtZone'
import IconType from '../@types/IconType'
import State from '../@types/State'
import { alertActionCreator as alert } from '../actions/alert'
import { dragInProgressActionCreator as dragInProgress } from '../actions/dragInProgress'
import { AlertText, AlertType } from '../constants'
import store from '../stores/app'
import haptics from '../util/haptics'

/** Creates the props for drop. */
const dropCollect = (monitor: DropTargetMonitor) => {
  const item = monitor.getItem() as DragThoughtItem

  return {
    isDragInProgress: !!monitor.getItem(),
    zone: item?.zone || null,
    isHovering: monitor.isOver({ shallow: true }),
  }
}

/** An icon that a thought can be dropped on to execute a command. */
const QuickDropIcon = ({
  alertType,
  Icon,
  onDrop,
  onHoverMessage,
}: {
  alertType: AlertType
  Icon: FC<IconType>
  onDrop: (state: State, item: DragThoughtItem) => void
  onHoverMessage: (state: State, zone: DragThoughtZone) => string
}) => {
  const dispatch = useDispatch()

  /** Invokes onDrop with the DragThoughtItem. */
  const drop = (monitor: DropTargetMonitor) => {
    haptics.medium()
    dispatch(dragInProgress({ value: false }))
    onDrop(store.getState(), monitor.getItem())
  }

  const [{ isHovering, zone }, dropTarget] = useDrop({
    accept: [DragAndDropType.Thought, NativeTypes.FILE],
    drop: (item, monitor) => drop(monitor),
    collect: dropCollect,
  })

  /** Show an alert on hover that notifies the user what will happen if the thought is dropped on the icon. */
  const hover = (isHovering: boolean, zone: DragThoughtZone) => {
    const state = store.getState()

    if (isHovering || state.alert?.alertType === alertType) {
      const message = isHovering
        ? typeof onHoverMessage === 'function'
          ? onHoverMessage(state, zone)
          : onHoverMessage
        : zone === DragThoughtZone.Thoughts
          ? AlertText.DragAndDrop
          : AlertText.ReorderFavorites

      store.dispatch(
        alert(message, {
          alertType: isHovering ? alertType : AlertType.DragAndDropHint,
          showCloseLink: false,
        }),
      )
    }
  }

  useEffect(
    () => {
      if (isHovering) {
        haptics.medium()
      }
      hover(isHovering, zone)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isHovering],
  )

  return (
    <div
      ref={dropTarget}
      className={css({
        zIndex: 'stack',
        height: '100%',
        width: '2em',
      })}
    ></div>
  )
}

export default QuickDropIcon
