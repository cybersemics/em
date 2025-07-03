import { FC, useEffect } from 'react'
import { DropTargetMonitor, useDrop } from 'react-dnd'
import { NativeTypes } from 'react-dnd-html5-backend'
import { useSelector } from 'react-redux'
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

  store.dispatch(dragInProgress({ value: false }))

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
  const length = state.draggingThoughts.length
  if (length === 0) return ''

  const action = zone === DragThoughtZone.Thoughts ? 'delete' : 'remove'
  const suffix = zone === DragThoughtZone.Thoughts ? '' : ' from favorites'

  if (length === 1) {
    const value = getThoughtById(state, head(state.draggingThoughts[0]))?.value
    return value ? `Drop to ${action} ${ellipsize(value)}${suffix}` : ''
  }

  return `Drop to ${action} ${length} thoughts${suffix}`
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
const QuickDropPanel: FC = () => {
  const [{ isHovering, zone }, dropTarget] = useDrop({
    accept: [DragAndDropType.Thought, NativeTypes.FILE],
    drop: item => drop(store.getState(), item as DragThoughtItem),
    collect: dropCollect,
  })

  /** Show an alert on hover that notifies the user what will happen if the thought is dropped on the icon. */
  const hover = (isHovering: boolean, zone: DragThoughtZone) => {
    const state = store.getState()

    if (isHovering || state.alert?.alertType === AlertType.DeleteDropHint) {
      const message = isHovering
        ? hoverMessage(state, zone)
        : zone === DragThoughtZone.Thoughts
          ? AlertText.DragAndDrop
          : AlertText.ReorderFavorites

      store.dispatch(
        alert(message, {
          alertType: isHovering ? AlertType.DeleteDropHint : AlertType.DragAndDropHint,
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
    <div className={css({ position: 'fixed', right: 0, top: 0, bottom: 0, zIndex: 'popup' })}>
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

/** Shows the QuickDropPanel when dragging. */
const QuickDropController: FC = () => {
  const dragInProgress = useSelector(state => state.dragInProgress)

  return dragInProgress ? <QuickDropPanel /> : null
}

export default QuickDropController
