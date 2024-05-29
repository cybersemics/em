import classNames from 'classnames'
import _ from 'lodash'
import { FC, useRef, useState } from 'react'
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
import { alertActionCreator as alert } from '../actions/alert'
import { dragHoldActionCreator as dragHold } from '../actions/dragHold'
import { dragInProgressActionCreator as dragInProgress } from '../actions/dragInProgress'
import { toggleUserSettingActionCreator as toggleUserSetting } from '../actions/toggleUserSetting'
import { updateThoughtsActionCreator as updateThoughts } from '../actions/updateThoughts'
import { AlertType, Settings, noop } from '../constants'
import * as selection from '../device/selection'
import useDragHold from '../hooks/useDragHold'
import { getLexeme } from '../selectors/getLexeme'
import getThoughtById from '../selectors/getThoughtById'
import getUserSetting from '../selectors/getUserSetting'
import themeColors from '../selectors/themeColors'
import thoughtToPath from '../selectors/thoughtToPath'
import store from '../stores/app'
import fastClick from '../util/fastClick'
import hashThought from '../util/hashThought'
import head from '../util/head'
import nonNull from '../util/nonNull'
import splice from '../util/splice'
import Checkbox from './Checkbox'
import ThoughtLink from './ThoughtLink'
import StarIcon from './icons/StarIcon'

/** Handles drag start. */
const beginDrag = ({ path, simplePath, zone }: DragThoughtItem): DragThoughtItem => {
  const offset = selection.offset()
  store.dispatch(
    dragInProgress({
      value: true,
      draggingThought: simplePath,
      sourceZone: zone,
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
  dragPreview: noop,
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
  const hideContexts = useSelector(getUserSetting(Settings.favoritesHideContexts))
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <div style={{ marginBottom: '0.5em', marginLeft: 2 }}>
      {/* Show Options toggle */}
      <div style={{ marginLeft: '1em' }}>
        <span
          {...fastClick(() => setShowOptions(!showOptions))}
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
        <CSSTransition in={showOptions} nodeRef={formRef} timeout={150} classNames='slidedown' unmountOnExit>
          <form
            ref={formRef}
            className='text-small'
            style={{
              backgroundColor: '#3e3e3e',
              borderRadius: '0.5em',
              padding: '1em',
            }}
          >
            <Checkbox
              checked={!hideContexts}
              title='Show full contexts'
              onChange={() => {
                dispatch(toggleUserSetting({ key: Settings.favoritesHideContexts }))
              }}
            />
          </form>
        </CSSTransition>
      </div>
    </div>
  )
}

/** Favorites list. */
const Favorites = ({ disableDragAndDrop }: { disableDragAndDrop?: boolean }) => {
  const [showOptions, setShowOptions] = useState(false)

  const simplePaths = useSelector(state => {
    return (getLexeme(state, '=favorite')?.contexts || [])
      .map(id => {
        const thought = getThoughtById(state, id)
        if (!thought) return null
        const path = thoughtToPath(state, thought.parentId)
        return path
      })
      .filter(nonNull)
  }, _.isEqual)

  const hideContexts = useSelector(getUserSetting(Settings.favoritesHideContexts))

  return (
    <div>
      <div>
        {simplePaths.length > 0 ? (
          <div>
            <FavoritesOptions setShowOptions={setShowOptions} showOptions={showOptions} />
            <div style={{ marginTop: '1em' }}>
              {simplePaths.map((simplePath, i) => (
                <DragAndDropFavorite
                  key={head(simplePath)}
                  simplePath={simplePath}
                  disableDragAndDrop={disableDragAndDrop}
                  hideContext={hideContexts}
                />
              ))}
            </div>
          </div>
        ) : (
          <div style={{ marginTop: '1em', maxWidth: 450 }}>
            To add a thought to your favorites list, set the cursor on a thought and tap{' '}
            <StarIcon style={{ verticalAlign: 'text-bottom' }} /> in the toolbar.
          </div>
        )}
        <DropEnd />
      </div>
    </div>
  )
}

export default Favorites
