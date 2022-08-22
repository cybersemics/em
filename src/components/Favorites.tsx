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
const beginDrag = ({ path }: { path: SimplePath }) => {
  const offset = selection.offset()
  store.dispatch(
    dragInProgress({
      value: true,
      draggingThought: path,
      ...(offset != null ? { offset } : null),
    }),
  )
  return { path }
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

/** Collects props from the DragSource. */
const dragCollect = (connect: DragSourceConnector, monitor: DragSourceMonitor) => ({
  dragSource: connect.dragSource(),
  dragPreview: NOOP,
  isDragging: monitor.isDragging(),
})

/** Handles dropping a thought on a DropTarget. */
const drop = (
  props: Parameters<typeof RecentlyEditedBreadcrumbs>[0] & { index?: number },
  monitor: DropTargetMonitor,
) => {
  // no bubbling
  if (monitor.didDrop() || !monitor.isOver({ shallow: true })) return

  const { path: thoughtsFrom } = monitor.getItem()
  const thoughtsTo = props.path

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

/** Collects props from the DropTarget. */
const dropCollect = (connect: DropTargetConnector, monitor: DropTargetMonitor) => ({
  dropTarget: connect.dropTarget(),
  isHovering: monitor.isOver({ shallow: true }),
  // is being hovered over current thought irrespective of whether the given item is droppable
  isBeingHoveredOver: monitor.isOver({ shallow: true }),
  isDeepHovering: monitor.isOver(),
})

/** A draggable and droppable thought. */
const DragAndDropThought = (el: FC<any>) =>
  DragSource('thought', { beginDrag, endDrag }, dragCollect)(DropTarget('thought', { drop }, dropCollect)(el))

const DragAndDropFavorite = DragAndDropThought(
  ({
    dragSource,
    dropTarget,
    isDragging,
    isHovering,
    path,
  }: {
    dragSource: any
    dropTarget: any
    isDragging: boolean
    isHovering: boolean
    path: SimplePath
  }) => {
    const colors = useSelector(themeColors)
    return dropTarget(
      dragSource(
        <div>
          <span
            className='drop-hover'
            style={{
              display: isHovering ? 'inline' : 'none',
              marginLeft: 0,
              marginTop: '-0.4em',
              width: 'calc(100% - 4em)',
            }}
          />
          <RecentlyEditedBreadcrumbs
            path={path}
            charLimit={32}
            thoughtsLimit={10}
            styleLink={{
              ...(isDragging
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
)(({ dropTarget, isHovering, path }: { dropTarget: any; isHovering: boolean; path: SimplePath }) =>
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

  const paths = useSelector((state: State) => {
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
    <div className='favorites recently-edited-sidebar'>
      <div className='header'>Favorites</div>
      <div style={{ padding: '0 2em' }}>
        {paths.length > 0
          ? paths.map((path, i) => <DragAndDropFavorite key={head(path)} index={i} path={path} />)
          : 'No favorites'}
        <DropEnd path={HOME_PATH as SimplePath} />
      </div>
    </div>
  )
}

export default Favorites
