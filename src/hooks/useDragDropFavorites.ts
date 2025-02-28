import { DragSourceMonitor, DropTargetMonitor, useDrag, useDrop } from 'react-dnd'
import { NativeTypes } from 'react-dnd-html5-backend'
import DragAndDropType from '../@types/DragAndDropType'
import DragThoughtItem from '../@types/DragThoughtItem'
import DragThoughtZone from '../@types/DragThoughtZone'
import Lexeme from '../@types/Lexeme'
import SimplePath from '../@types/SimplePath'
import { alertActionCreator as alert } from '../actions/alert'
import { dragHoldActionCreator as dragHold } from '../actions/dragHold'
import { dragInProgressActionCreator as dragInProgress } from '../actions/dragInProgress'
import { updateThoughtsActionCreator as updateThoughts } from '../actions/updateThoughts'
import { AlertType } from '../constants'
import * as selection from '../device/selection'
import { getLexeme } from '../selectors/getLexeme'
import getThoughtById from '../selectors/getThoughtById'
import store from '../stores/app'
import haptics from '../util/haptics'
import hashThought from '../util/hashThought'
import head from '../util/head'
import splice from '../util/splice'

type DragAndDropFavoriteReturnType = DragThoughtItem & {
  disableDragAndDrop?: boolean
}

/** Handles drag start. */
const beginDrag = ({ path, simplePath }: DragThoughtItem): DragThoughtItem => {
  const offset = selection.offset()
  store.dispatch(
    dragInProgress({
      value: true,
      draggingThought: simplePath,
      sourceZone: DragThoughtZone.Favorites,
      ...(offset != null ? { offset } : null),
    }),
  )
  return { path, simplePath, zone: DragThoughtZone.Favorites }
}

/** Handles drag end. */
const endDrag = () => {
  store.dispatch([
    dragInProgress({ value: false }),
    dragHold({ value: false }),
    (dispatch, getState) => {
      if (getState().alert?.alertType === AlertType.DragAndDropHint) {
        dispatch(alert(null))
      }
    },
  ])
}

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

  const { simplePath: thoughtsFrom, zone } = monitor.getItem() as DragThoughtItem
  if (zone === DragThoughtZone.Thoughts) {
    console.error('TODO: Add support for other thought drag sources', monitor.getItem())
    return
  }
  const thoughtsTo = simplePath

  const state = store.getState()

  const lexemeFavorites = getLexeme(state, '=favorite')
  if (!lexemeFavorites) {
    throw new Error('=favorite lexeme missing')
  }
  // the index of thoughtsFrom id within the =favorite lexeme contexts
  const indexFrom = lexemeFavorites.contexts.findIndex(cxid => {
    const thought = getThoughtById(state, cxid)
    return thought?.parentId === head(thoughtsFrom)
  })
  const fromId = lexemeFavorites.contexts[indexFrom]

  // the index of the thoughtsTo id within the =favorite lexeme contexts
  // -1 indicates end of the list
  const indexTo = thoughtsTo
    ? lexemeFavorites.contexts.findIndex(cxid => {
        const thought = getThoughtById(state, cxid)
        return thought?.parentId === head(thoughtsTo)
      })
    : lexemeFavorites.contexts.length

  // do nothing if dropping in the same position (above or below the dropped thought)
  if (indexFrom === indexTo || indexFrom === indexTo - 1) return

  // first, remove the thought from the contexts array
  const contextsTemp = splice(lexemeFavorites.contexts, indexFrom, 1)

  // then insert the thought at the drop point
  const contextsNew = splice(
    contextsTemp,
    // if dropping after indexFrom, we need to decrement the index by 1 to account for the adjusted indexes in contextsTemp after splicing the contexts
    indexTo - (indexTo > indexFrom ? 1 : 0),
    0,
    fromId,
  )

  const lexemeNew: Lexeme = {
    ...lexemeFavorites,
    contexts: contextsNew,
  }

  haptics.medium()

  store.dispatch(
    updateThoughts({
      thoughtIndexUpdates: {},
      lexemeIndexUpdates: {
        [hashThought('=favorite')]: lexemeNew,
      },
    }),
  )
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
