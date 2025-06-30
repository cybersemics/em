import { useEffect } from 'react'
import { DropTargetMonitor, useDrop } from 'react-dnd'
import { NativeTypes } from 'react-dnd-html5-backend'
import { useSelector } from 'react-redux'
import { useDispatch } from 'react-redux'
import { css } from '../../styled-system/css'
import DragAndDropType from '../@types/DragAndDropType'
import DragThoughtItem from '../@types/DragThoughtItem'
import DragThoughtZone from '../@types/DragThoughtZone'
import State from '../@types/State'
import { alertActionCreator as alert } from '../actions/alert'
import { archiveThoughtActionCreator as archiveThought } from '../actions/archiveThought'
import { dragInProgressActionCreator as dragInProgress } from '../actions/dragInProgress'
import { toggleAttributeActionCreator as toggleAttribute } from '../actions/toggleAttribute'
import { AlertText, AlertType, DELETE_VIBRATE_DURATION } from '../constants'
import getThoughtById from '../selectors/getThoughtById'
import store from '../stores/app'
import ellipsize from '../util/ellipsize'
import haptics from '../util/haptics'
import head from '../util/head'

/** Delete the thought on drop. */
const drop = (state: State, { simplePath, path, zone }: DragThoughtItem) => {
  const value = getThoughtById(state, head(simplePath))?.value
  if (value === undefined) {
    console.warn(`Missing thought for path ${simplePath}. Aborting deleteDrop.`)
    return
  }

  if (zone === DragThoughtZone.Favorites) {
    haptics.light()
    store.dispatch([
      toggleAttribute({ path: simplePath, values: ['=favorite', 'true'] }),
      alert(`Removed ${ellipsize(value)} from favorites`, {
        clearDelay: 8000,
        showCloseLink: true,
      }),
    ])
  } else if (zone === DragThoughtZone.Thoughts) {
    haptics.vibrate(DELETE_VIBRATE_DURATION)
    store.dispatch(archiveThought({ path }))
  } else {
    console.error(`Unsupported DragThoughtZone: ${zone}`)
  }
}

/** Show an alert on hover that notifies the user the thought will be copied if dropped on the icon. */
const hoverMessage = (state: State, zone: DragThoughtZone) => {
  const value = state.draggingThought && getThoughtById(state, head(state.draggingThought))?.value
  return zone === DragThoughtZone.Thoughts
    ? `Drop to delete ${ellipsize(value!)}`
    : `Drop to remove ${ellipsize(value!)} from favorites`
}

/** Creates the props for drop. */
const dropCollect = (monitor: DropTargetMonitor) => {
  const item = monitor.getItem() as DragThoughtItem

  return {
    isDragInProgress: !!monitor.getItem(),
    zone: item?.zone || null,
    isHovering: monitor.isOver({ shallow: true }),
  }
}

/** An invisible panel at the right edge of the screen during drag-and-drop that allows for quick delete. */
const QuickDropPanel = ({
  alertType,
  onDrop,
}: {
  alertType: AlertType
  onDrop: (state: State, item: DragThoughtItem) => void
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
        ? hoverMessage(state, zone)
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
      className={css({ position: 'fixed', right: 0, top: 0, bottom: 0, zIndex: 'popup' })}
      data-testid='quick-drop-panel'
    >
      <div
        ref={dropTarget}
        className={css({
          zIndex: 'stack',
          height: '100%',
          width: '2em',
        })}
      ></div>
    </div>
  )
}

/** An invisible panel at the right edge of the screen during drag-and-drop that allows for quick delete. */
const QuickDropController = () => {
  const isDragging = useSelector(state => state.dragHold || state.dragInProgress)

  return isDragging ? <QuickDropPanel alertType={AlertType.DeleteDropHint} onDrop={drop} /> : null
}

export default QuickDropController
