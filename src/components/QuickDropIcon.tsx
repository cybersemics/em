import { FC, useEffect } from 'react'
import { DropTargetMonitor, useDrop } from 'react-dnd'
import { NativeTypes } from 'react-dnd-html5-backend'
import { useDispatch, useSelector } from 'react-redux'
import DragAndDropType from '../@types/DragAndDropType'
import DragThoughtItem from '../@types/DragThoughtItem'
import DragThoughtZone from '../@types/DragThoughtZone'
import IconType from '../@types/Icon'
import State from '../@types/State'
import { alertActionCreator as alert } from '../actions/alert'
import { dragInProgressActionCreator as dragInProgress } from '../actions/dragInProgress'
import { AlertText, AlertType } from '../constants'
import theme from '../selectors/theme'
import store from '../stores/app'

/** Creates the props for drop. */
const dropCollect = (monitor: DropTargetMonitor) => ({
  isDragInProgress: !!monitor.getItem(),
  zone: monitor.getItem()?.zone || null,
  isHovering: monitor.isOver({ shallow: true }),
})

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
  const dark = useSelector(state => theme(state) !== 'Light')
  const fontSize = useSelector(state => state.fontSize)

  /** Invokes onDrop with the DragThoughtItem. */
  const drop = (monitor: DropTargetMonitor) => {
    dispatch(dragInProgress({ value: false }))
    onDrop(store.getState(), monitor.getItem())
  }

  const [{ isHovering, zone }, dropTarget] = useDrop(() => ({
    accept: [DragAndDropType.Thought, NativeTypes.FILE],
    drop: (item, monitor) => drop(monitor),
    collect: dropCollect,
  }))

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
      hover(isHovering, zone)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isHovering],
  )

  return (
    <div style={{ marginBottom: 10 }}>
      <div
        className='z-index-stack'
        ref={dropTarget}
        style={{
          padding: '1em',
          borderRadius: '999px 0 0 999px',
          backgroundColor: isHovering ? 'rgba(40,40,40,0.8)' : 'rgba(30,30,30,0.8)',
        }}
      >
        <Icon
          size={fontSize * 1.5}
          fill={isHovering ? (dark ? 'lightblue' : 'royalblue') : dark ? 'white' : 'black'}
          // disable default .icon transition so that highlight is immediate
          style={{ cursor: 'move', transition: 'none', verticalAlign: 'middle' }}
        />
      </div>
    </div>
  )
}

export default QuickDropIcon
