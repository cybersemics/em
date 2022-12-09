import classNames from 'classnames'
import _ from 'lodash'
import React, { FC, useEffect, useState } from 'react'
import {
  DragSource,
  DragSourceConnector,
  DragSourceMonitor,
  DropTarget,
  DropTargetConnector,
  DropTargetMonitor,
} from 'react-dnd'
import { useDispatch, useSelector } from 'react-redux'
import CSSTransition from 'react-transition-group/CSSTransition'
import DragThoughtItem from '../@types/DragThoughtItem'
import DragThoughtZone from '../@types/DragThoughtZone'
import Lexeme from '../@types/Lexeme'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import alert from '../action-creators/alert'
import dragHold from '../action-creators/dragHold'
import dragInProgress from '../action-creators/dragInProgress'
import pullPendingLexemes from '../action-creators/pullPendingLexemes'
import toggleAttribute from '../action-creators/toggleAttribute'
import updateThoughts from '../action-creators/updateThoughts'
import { AlertType, EM_TOKEN, NOOP } from '../constants'
import * as selection from '../device/selection'
import useDragHold from '../hooks/useDragHold'
import findDescendant from '../selectors/findDescendant'
import { getLexeme } from '../selectors/getLexeme'
import getThoughtById from '../selectors/getThoughtById'
import themeColors from '../selectors/themeColors'
import thoughtToPath from '../selectors/thoughtToPath'
import store from '../stores/app'
import hashThought from '../util/hashThought'
import head from '../util/head'
import splice from '../util/splice'
import ThoughtLink from './ThoughtLink'

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

/** Returns true if the Favorite can be dropped at the given DropTarget. */
const canDrop = (props: { disableDragAndDrop: boolean; simplePath: SimplePath }, monitor: DropTargetMonitor) =>
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
  isHovering: monitor.isOver({ shallow: true }) && monitor.canDrop(),
})

type DragAndDropFavoriteReturnType = ReturnType<typeof dragCollect> &
  ReturnType<typeof dropCollect> & {
    disableDragAndDrop?: boolean
    simplePath: SimplePath
  }
/** A draggable and droppable thought. */
const DragAndDropThought = (el: FC<DragAndDropFavoriteReturnType & { hideContext?: boolean }>) =>
  DragSource('thought', { beginDrag, endDrag }, dragCollect)(DropTarget('thought', { canDrop, drop }, dropCollect)(el))

const DragAndDropFavorite = DragAndDropThought(
  ({
    disableDragAndDrop,
    dragSource,
    dropTarget,
    hideContext,
    isDragging,
    isHovering,
    simplePath,
  }: DragAndDropFavoriteReturnType & { hideContext?: boolean }) => {
    const colors = useSelector(themeColors)
    const dragHoldResult = useDragHold({ isDragging, simplePath, sourceZone: DragThoughtZone.Favorites })
    return dropTarget(
      dragSource(
        // Set overflow:auto so the drop target fully wraps its contents.
        // Otherwise the context-breadcrumbs margin-top will leak out and create a dead zone where the favorite cannot be dropped.
        <div {...dragHoldResult.props} style={{ overflow: 'auto' }}>
          {!disableDragAndDrop && isHovering && (
            <span
              className={classNames({
                'drop-hover': true,
                pressed: !disableDragAndDrop && dragHoldResult.isPressed,
              })}
              style={{
                backgroundColor: colors.highlight,
                marginLeft: 0,
                marginTop: '-0.4em',
                width: 'calc(100% - 4em)',
              }}
            />
          )}
          <ThoughtLink
            hideContext={hideContext}
            path={simplePath}
            styleLink={{
              ...(!disableDragAndDrop &&
                (isDragging || dragHoldResult.isPressed
                  ? {
                      color: colors.highlight,
                      fontWeight: 'bold',
                    }
                  : undefined)),
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
)(({ dropTarget, isHovering }: ReturnType<typeof dropCollect>) => {
  if (!isHovering) return null
  return dropTarget(
    <div style={{ height: '4em' }}>
      <span
        className='drop-hover'
        style={{
          marginLeft: 0,
          marginTop: 0,
          width: 'calc(100% - 4em)',
        }}
      />
    </div>,
  )
})

/** Favorites Options toggle link and list of options. */
const FavoritesOptions = ({
  setShowOptions,
  showOptions,
}: {
  setShowOptions: (value: boolean) => void
  showOptions?: boolean
}) => {
  const dispatch = useDispatch()
  const hideContexts = useSelector(
    (state: State) => !!findDescendant(state, EM_TOKEN, ['Settings', 'favoritesHideContexts']),
  )

  return (
    <div style={{ marginBottom: '0.5em' }}>
      {/* Show Options toggle */}
      <div style={{ textAlign: 'center' }}>
        <span
          onClick={() => setShowOptions(!showOptions)}
          style={{ color: '#444', cursor: 'pointer', fontSize: '0.7em', fontWeight: 'bold', position: 'relative' }}
        >
          <span
            style={{
              display: 'inline-block',
              transform: `rotate(${showOptions ? 90 : 0}deg)`,
              transition: 'transform 150ms ease-out',
              // avoid position:absolute to trivially achieve correct vertical alignment with text
              marginLeft: '-1em',
            }}
          >
            ▸
          </span>{' '}
          <span>OPTIONS</span>
        </span>
      </div>

      <div style={{ overflow: 'hidden' }}>
        <CSSTransition in={showOptions} timeout={150} classNames='slidedown' unmountOnExit>
          <form
            style={{
              backgroundColor: '#3e3e3e',
              borderRadius: '0.5em',
              fontSize: '0.8em',
              padding: '0.5em',
            }}
          >
            <label style={{ cursor: 'pointer', userSelect: 'none' }}>
              <input
                type='checkbox'
                checked={!hideContexts}
                onChange={e => {
                  // Note: never preventDefault on a controlled checkbox in React.
                  // See: https://stackoverflow.com/a/70030088/4806080
                  dispatch(toggleAttribute({ path: [EM_TOKEN], values: ['Settings', 'favoritesHideContexts'] }))
                }}
                style={{ cursor: 'pointer' }}
              ></input>{' '}
              Show full contexts
            </label>
          </form>
        </CSSTransition>
      </div>
    </div>
  )
}

/** Favorites list. */
const Favorites = ({ disableDragAndDrop }: { disableDragAndDrop?: boolean }) => {
  const dispatch = useDispatch()
  const [showOptions, setShowOptions] = useState(false)
  const colors = useSelector(themeColors)

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

  const hideContexts = useSelector(
    (state: State) => !!findDescendant(state, EM_TOKEN, ['Settings', 'favoritesHideContexts']),
  )

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
    <div
      className='favorites sidebar'
      style={{
        userSelect: 'none',
        // must be position:relative to ensure drop hovers are positioned correctly when sidebar is scrolled
        position: 'relative',
        padding: '0 1em',
        minWidth: '60vw',
      }}
    >
      {/* <div
        onClick={() => setShowOptions(!showOptions)}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          fontSize: '1.2em',
          fontWeight: 'bold',
          padding: '0.25em',
        }}
      >
        <SettingsIcon />
      </div> */}

      <div className='header' style={{ color: colors.fg, fontSize: '1.2em', fontWeight: 600, marginBottom: 0 }}>
        Favorites
      </div>

      <FavoritesOptions setShowOptions={setShowOptions} showOptions={showOptions} />

      <div>
        {simplePaths.length > 0
          ? simplePaths.map((simplePath, i) => (
              <DragAndDropFavorite
                key={head(simplePath)}
                simplePath={simplePath}
                disableDragAndDrop={disableDragAndDrop}
                hideContext={hideContexts}
              />
            ))
          : 'No favorites'}
        <DropEnd />
      </div>
    </div>
  )
}

export default Favorites
