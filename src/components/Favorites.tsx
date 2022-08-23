import classNames from 'classnames'
import _ from 'lodash'
import React, { FC, useEffect } from 'react'
import {
  DragSource,
  DragSourceConnector,
  DragSourceMonitor,
  DropTarget,
  DropTargetConnector,
  DropTargetMonitor,
} from 'react-dnd'
import { useDispatch, useSelector } from 'react-redux'
import DragThoughtItem from '../@types/DragThoughtItem'
import DragThoughtZone from '../@types/DragThoughtZone'
import Lexeme from '../@types/Lexeme'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import alert from '../action-creators/alert'
import dragHold from '../action-creators/dragHold'
import dragInProgress from '../action-creators/dragInProgress'
import pullPendingLexemes from '../action-creators/pullPendingLexemes'
import updateThoughts from '../action-creators/updateThoughts'
import { AlertType, HOME_PATH, NOOP } from '../constants'
import * as selection from '../device/selection'
import useDragHold from '../hooks/useDragHold'
import { getLexeme } from '../selectors/getLexeme'
import getThoughtById from '../selectors/getThoughtById'
import themeColors from '../selectors/themeColors'
import thoughtToPath from '../selectors/thoughtToPath'
import { store } from '../store'
import hashThought from '../util/hashThought'
import head from '../util/head'
import splice from '../util/splice'
import RecentlyEditedBreadcrumbs from './RecentlyEditedBreadcrumbs'

/** Handles drag start. */
const beginDrag = ({ simplePath, zone }: { simplePath: SimplePath; zone: DragThoughtZone }): DragThoughtItem => {
  const offset = selection.offset()
  store.dispatch(
    dragInProgress({
      value: true,
      draggingThought: simplePath,
      sourceZone: zone,
      ...(offset != null ? { offset } : null),
    }),
  )
  return { simplePath, zone: DragThoughtZone.Favorites }
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

/** Handles dropping a thought on a DropTarget. */
const drop = ({ simplePath }: { simplePath: SimplePath }, monitor: DropTargetMonitor) => {
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
  // the index of the thoughtsFrom path within the =favorite lexeme contexts
  const indexFrom = lexemeFavorites.contexts.findIndex(cxid => {
    const thought = getThoughtById(state, cxid)
    return thought && thought.parentId === head(thoughtsFrom)
  })
  const fromId = lexemeFavorites.contexts[indexFrom]
  const indexTo = lexemeFavorites.contexts.findIndex(cxid => {
    const thought = getThoughtById(state, cxid)
    return thought && thought.parentId === head(thoughtsTo)
  })
  if (indexFrom === indexTo) return

  const contextsTemp = splice(lexemeFavorites.contexts, indexFrom, 1)
  const lexemeNew: Lexeme = {
    ...lexemeFavorites,
    contexts: indexTo !== -1 ? splice(contextsTemp, indexTo, 0, fromId) : [...contextsTemp, fromId],
  }

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
const dragCollect = (connect: DragSourceConnector, monitor: DragSourceMonitor) => ({
  dragSource: connect.dragSource(),
  dragPreview: NOOP,
  isDragging: monitor.isDragging(),
})

/** Collects props from the DropTarget. */
const dropCollect = (connect: DropTargetConnector, monitor: DropTargetMonitor) => ({
  dropTarget: connect.dropTarget(),
  isHovering: monitor.isOver({ shallow: true }),
  // is being hovered over current thought irrespective of whether the given item is droppable
  isBeingHoveredOver: monitor.isOver({ shallow: true }),
  isDeepHovering: monitor.isOver(),
})

type DragAndDropFavoriteReturnType = ReturnType<typeof dragCollect> &
  ReturnType<typeof dropCollect> & {
    simplePath: SimplePath
  }
/** A draggable and droppable thought. */
const DragAndDropThought = (el: FC<DragAndDropFavoriteReturnType>) =>
  DragSource('thought', { beginDrag, endDrag }, dragCollect)(DropTarget('thought', { drop }, dropCollect)(el))

const DragAndDropFavorite = DragAndDropThought(
  ({ dragSource, dropTarget, isDragging, isHovering, simplePath }: DragAndDropFavoriteReturnType) => {
    const colors = useSelector(themeColors)
    const dragHoldResult = useDragHold({ isDragging, simplePath })
    return dropTarget(
      dragSource(
        <div {...dragHoldResult.props}>
          <span
            className={classNames({
              'drop-hover': true,
              pressed: dragHoldResult.isPressed,
            })}
            style={{
              display: isHovering ? 'inline' : 'none',
              marginLeft: 0,
              marginTop: '-0.4em',
              width: 'calc(100% - 4em)',
            }}
          />
          <RecentlyEditedBreadcrumbs
            simplePath={simplePath}
            charLimit={32}
            thoughtsLimit={10}
            styleLink={{
              ...(isDragging || dragHoldResult.isPressed
                ? {
                    color: colors.highlight,
                    fontWeight: 'bold',
                  }
                : undefined),
            }}
          />
        </div>,
      ),
    )
  },
)

/** Drop target for end of the favorites list. */
const DropEnd = DropTarget(
  'thought',
  { drop },
  dropCollect,
)(({ dropTarget, isHovering, simplePath }: ReturnType<typeof dropCollect> & { simplePath: SimplePath }) =>
  dropTarget(
    <div style={{ height: '4em' }}>
      <span
        className='drop-hover'
        style={{
          display: isHovering ? 'inline' : 'none',
          marginLeft: 0,
          marginTop: 0,
          width: 'calc(100% - 4em)',
        }}
      />
    </div>,
  ),
)

/** Favorites list. */
const Favorites = () => {
  const dispatch = useDispatch()

  // true if all favorites have been loaded
  const favoritesLoaded = useSelector((state: State) => {
    const lexeme = getLexeme(state, '=favorite')
    return lexeme && lexeme.contexts.every(cxid => getThoughtById(state, cxid))
  })

  const simplePaths = useSelector((state: State) => {
    return (getLexeme(state, '=favorite')?.contexts || [])
      .map(id => {
        const thought = getThoughtById(state, id)
        if (!thought) return null
        const path = thoughtToPath(state, thought.parentId)
        return path
      })
      .filter(x => x) as SimplePath[]
  }, _.isEqual)

  useEffect(() => {
    if (favoritesLoaded) return
    dispatch(
      pullPendingLexemes(
        {
          thoughtIndexUpdates: {},
          lexemeIndexUpdates: {},
          pendingLexemes: {
            [hashThought('=favorite')]: true,
          },
        },
        { skipConflictResolution: true },
      ),
    )
  }, [favoritesLoaded])

  return (
    <div className='favorites recently-edited-sidebar' style={{ userSelect: 'none' }}>
      <div className='header'>Favorites</div>
      <div style={{ padding: '0 2em' }}>
        {simplePaths.length > 0
          ? simplePaths.map((simplePath, i) => <DragAndDropFavorite key={head(simplePath)} simplePath={simplePath} />)
          : 'No favorites'}
        <DropEnd simplePath={HOME_PATH as SimplePath} />
      </div>
    </div>
  )
}

export default Favorites
