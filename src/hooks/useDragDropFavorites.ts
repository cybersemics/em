import { DragSourceMonitor, DropTargetMonitor, useDrag, useDrop } from 'react-dnd'
import { NativeTypes } from 'react-dnd-html5-backend'
import DragAndDropType from '../@types/DragAndDropType'
import DragThoughtItem from '../@types/DragThoughtItem'
import DragThoughtZone from '../@types/DragThoughtZone'
import SimplePath from '../@types/SimplePath'
import { alertActionCreator as alert } from '../actions/alert'
import { longPressActionCreator as longPress } from '../actions/longPress'
import { settingsActionCreator as settings } from '../actions/settings'
import { AlertType, LongPressState } from '../constants'
import * as selection from '../device/selection'
import getFavoriteIds from '../selectors/getFavoriteIds'
import getThoughtById from '../selectors/getThoughtById'
import store from '../stores/app'
import haptics from '../util/haptics'
import head from '../util/head'
import splice from '../util/splice'

type DragAndDropFavoriteReturnType = DragThoughtItem & {
  disableDragAndDrop?: boolean
}

/** Handles drag start. */
const beginDrag = ({ path, simplePath }: DragThoughtItem): DragThoughtItem[] => {
  const offset = selection.offset()

  store.dispatch(
    longPress({
      value: LongPressState.DragInProgress,
      draggingThoughts: [simplePath],
      sourceZone: DragThoughtZone.Favorites,
      ...(offset != null ? { offset } : null),
    }),
  )
  return [{ path, simplePath, zone: DragThoughtZone.Favorites }]
}

/** Handles drag end. */
const endDrag = () =>
  store.dispatch([
    longPress({ value: LongPressState.Inactive }),
    (dispatch, getState) => {
      if (getState().alert?.alertType === AlertType.DragAndDropHint) {
        dispatch(alert(null))
      }
    },
  ])

/** Returns true if the Favorite can be dropped at the given DropTarget. */
//eslint disable rule because monitor use in canDrop function
const canDrop = (props: { disableDragAndDrop?: boolean; simplePath: SimplePath }, monitor: DropTargetMonitor) =>
  !props.disableDragAndDrop

/** Handles dropping a thought on a DropTarget. */
const drop = (
  {
    simplePath,
  }: {
    // when simplePath is null, it means the thought was dropped on DropEnd at the end of the favorites list
    simplePath: SimplePath | null
  },
  monitor: DropTargetMonitor,
) => {
  // no bubbling
  if (monitor.didDrop() || !monitor.isOver({ shallow: true })) return

  const item = monitor.getItem() as DragThoughtItem[]
  // For favorites, we expect only a single item in the array
  const draggedItem = item[0]
  const { simplePath: thoughtsFrom, zone } = draggedItem
  if (zone === DragThoughtZone.Thoughts) {
    console.error('TODO: Add support for other thought drag sources', monitor.getItem())
    return
  }
  store.dispatch((dispatch, getState) => {
    const state = getState()
    const favorites = getFavoriteIds(state)
    const indexFrom = favorites.findIndex(id => getThoughtById(state, id)?.parentId === head(thoughtsFrom))
    const indexTo = simplePath
      ? favorites.findIndex(id => getThoughtById(state, id)?.parentId === head(simplePath))
      : favorites.length

    // A favorite may have been removed during the drag. Adjacent drops already have the requested order.
    if (indexFrom < 0 || indexTo < 0 || indexFrom === indexTo || indexFrom === indexTo - 1) return

    const remaining = splice(favorites, indexFrom, 1)
    const reordered = splice(remaining, indexTo - (indexTo > indexFrom ? 1 : 0), 0, favorites[indexFrom])

    haptics.medium()
    dispatch(settings({ key: 'Favorites Order', value: JSON.stringify(reordered) }))
  })
}

/** Collects props from the DragSource. */
const dragCollect = (monitor: DragSourceMonitor) => ({
  isDragging: monitor.isDragging(),
})

/** Collects props from the DropTarget. */
const dropCollect = (monitor: DropTargetMonitor) => ({
  isHovering: monitor.isOver({ shallow: true }) && monitor.canDrop(),
})

/** A draggable and droppable Favorite hook. */
const useDragAndDropFavorites = (props: Partial<DragAndDropFavoriteReturnType>) => {
  const propsTypes = props as DragAndDropFavoriteReturnType

  const [{ isDragging }, dragSource, dragPreview] = useDrag({
    type: DragAndDropType.Thought,
    item: () => beginDrag(propsTypes),
    end: () => endDrag(),
    collect: dragCollect,
  })

  const [{ isHovering }, dropTarget] = useDrop({
    accept: [DragAndDropType.Thought, NativeTypes.FILE],
    canDrop: (item, monitor) => canDrop(propsTypes, monitor),
    drop: (item, monitor) => drop(propsTypes, monitor),
    collect: dropCollect,
  })

  return { isDragging, dragSource, dragPreview, isHovering, dropTarget }
}

export default useDragAndDropFavorites
