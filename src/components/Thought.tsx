import React, { useEffect } from 'react'
import { ThunkDispatch } from 'redux-thunk'
import { connect } from 'react-redux'
import classNames from 'classnames'
import { DragSource, DragSourceConnector, DragSourceMonitor, DropTarget, DropTargetConnector, DropTargetMonitor } from 'react-dnd'
import { getEmptyImage } from 'react-dnd-html5-backend'
import { isTouch } from '../browser'
import { store } from '../store'
import globals from '../globals'
import { alert, dragHold, dragInProgress, error, existingThoughtMove, expandContextThought, newThoughtSubmit, setCursor, toggleTopControlsAndBreadcrumbs } from '../action-creators'
import { DROP_TARGET, MAX_DISTANCE_FROM_CURSOR, TIMEOUT_BEFORE_DRAG } from '../constants'
import { State } from '../util/initialState'
import { Child, Lexeme, Path, SimplePath, ThoughtContext } from '../types'

// components
import Bullet from './Bullet'
import BulletCursorOverlay from './BulletCursorOverlay'
import Byline from './Byline'
import ContextBreadcrumbs from './ContextBreadcrumbs'
import Divider from './Divider'
import Editable from './Editable'
import HomeLink from './HomeLink'
import Note from './Note'
import Subthoughts from './Subthoughts'
import Superscript from './Superscript'
import ThoughtAnnotation from './ThoughtAnnotation'
import useLongPress from '../hooks/useLongPress'

// util
import {
  parentOf,
  ellipsize,
  equalArrays,
  equalPath,
  hashContext,
  head,
  headValue,
  isDivider,
  isDocumentEditable,
  isEM,
  isFunction,
  parseJsonSafe,
  pathToContext,
  publishMode,
  isDescendantPath,
  isRoot,
  unroot,
} from '../util'

// selectors
import {
  attribute,
  attributeEquals,
  getNextRank,
  getRankBefore,
  getSortPreference,
  getStyle,
  getThought,
  getAllChildren,
  getChildrenRanked,
  hasChild,
  hasChildren,
  isBefore,
  isContextViewActive,
  rootedParentOf,
} from '../selectors'
import useIsChildHovering from '../hooks/useIsChildHovering'
import { compareReasonable } from '../util/compareThought'

/**********************************************************************
 * Redux
 **********************************************************************/

interface ThoughtProps {
  cursorOffset?: number | null,
  hideBullet?: boolean,
  homeContext?: boolean,
  isDraggable?: boolean,
  isDragging?: boolean,
  isPublishChild?: boolean,
  isEditing?: boolean,
  isLeaf?: boolean,
  path: Path,
  publish?: boolean,
  rank: number,
  showContextBreadcrumbs?: boolean,
  showContexts?: boolean,
  style?: React.CSSProperties,
  simplePath: SimplePath,
  view?: string | null,
}

interface ThoughtContainerProps {
  allowSingleContext?: boolean,
  childrenForced?: Child[],
  contextBinding?: Path,
  path: Path,
  count?: number,
  cursor?: Path | null,
  depth?: number,
  expandedContextThought?: Path,
  hideBullet?: boolean,
  isDeepHovering?: boolean,
  isPublishChild?: boolean,
  isCursorGrandparent?: boolean,
  isCursorParent?: boolean,
  isDraggable?: boolean,
  isDragging?: boolean,
  isEditing?: boolean,
  isEditingPath?: boolean,
  isExpanded?: boolean,
  isHovering?: boolean,
  isParentHovering?: boolean,
  prevChild?: Child | ThoughtContext,
  publish?: boolean,
  rank: number,
  showContexts?: boolean,
  style?: React.CSSProperties,
  thought?: Lexeme,
  simplePath: SimplePath,
  simplePathLive?: SimplePath,
  view?: string | null,
}

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State, props: ThoughtContainerProps) => {

  const {
    cursor,
    cursorOffset,
    expanded,
    expandedContextThought,
    search,
  } = state

  const {
    path,
    simplePath,
    showContexts,
    depth,
  } = props

  // check if the cursor path includes the current thought
  const isEditingPath = isDescendantPath(cursor, path)

  // check if the cursor is editing a thought directly
  const isEditing = equalPath(cursor, path)

  const simplePathLive = isEditing
    ? parentOf(simplePath).concat(head(showContexts ? parentOf(cursor!) : cursor!)) as SimplePath
    : simplePath

  const distance = cursor ? Math.max(0,
    Math.min(MAX_DISTANCE_FROM_CURSOR, cursor.length - depth!)
  ) : 0

  const isCursorParent = distance === 2
    // grandparent
    ? equalPath(rootedParentOf(state, parentOf(cursor || [])), path) && getChildrenRanked(state, pathToContext(cursor || [])).length === 0
    // parent
    : equalPath(parentOf(cursor || []), path)

  const contextBinding = parseJsonSafe(attribute(state, pathToContext(simplePathLive), '=bindContext') ?? '') as SimplePath | undefined

  const isCursorGrandparent =
    equalPath(rootedParentOf(state, parentOf(cursor || [])), path)

  const value = headValue(simplePathLive)

  const isExpanded = !!expanded[hashContext(pathToContext(path))]

  const thought = getThought(state, value)

  return {
    contextBinding,
    cursorOffset,
    distance,
    isPublishChild: !search && publishMode() && simplePath.length === 2,
    isCursorParent,
    isCursorGrandparent,
    expandedContextThought,
    isEditing,
    isEditingPath,
    isExpanded,
    publish: !search && publishMode(),
    thought,
    simplePathLive,
    view: attribute(state, pathToContext(simplePathLive), '=view'),
  }
}

// eslint-disable-next-line jsdoc/require-jsdoc
const mapDispatchToProps = (dispatch: ThunkDispatch<State, unknown, any>) => ({
  toggleTopControlsAndBreadcrumbs: () => dispatch(toggleTopControlsAndBreadcrumbs(false)),
  setCursorOnNote: ({ path }: { path: Path }) => () => dispatch(setCursor({
    path,
    cursorHistoryClear: true,
    editing: true,
    noteFocus: true
  })),
})

/**********************************************************************
 * Drag and Drop
 **********************************************************************/

// eslint-disable-next-line jsdoc/require-jsdoc
const canDrag = (props: ConnectedThoughtContainerProps) => {
  const state = store.getState()
  const thoughts = pathToContext(props.simplePathLive!)
  const context = parentOf(pathToContext(props.simplePathLive!))
  const isDraggable = props.isDraggable || props.isCursorParent

  return isDocumentEditable() &&
    !!isDraggable &&
    (!isTouch || globals.touched) &&
    !hasChild(state, thoughts, '=immovable') &&
    !hasChild(state, thoughts, '=readonly') &&
    !hasChild(state, context, '=immovable') &&
    !hasChild(state, context, '=readonly')
}

// eslint-disable-next-line jsdoc/require-jsdoc
const beginDrag = ({ simplePathLive }: ConnectedThoughtContainerProps) => {
  store.dispatch(dragInProgress({
    value: true,
    draggingThought: simplePathLive,
    offset: document.getSelection()?.focusOffset,
  }))
  return { simplePath: simplePathLive }
}

// eslint-disable-next-line jsdoc/require-jsdoc
const endDrag = () => {
  store.dispatch([
    dragInProgress({ value: false }),
    dragHold({ value: false }),
    alert(null)
  ])
}

// eslint-disable-next-line jsdoc/require-jsdoc
const dragCollect = (connect: DragSourceConnector, monitor: DragSourceMonitor) => ({
  dragSource: connect.dragSource(),
  dragPreview: connect.dragPreview(),
  isDragging: monitor.isDragging()
})

// eslint-disable-next-line jsdoc/require-jsdoc
const canDrop = (props: ConnectedThoughtContainerProps, monitor: DropTargetMonitor) => {

  const state = store.getState()
  const { cursor } = state
  const { simplePath: thoughtsFrom } = monitor.getItem()
  const thoughtsTo = props.simplePathLive!
  const thoughts = pathToContext(props.simplePathLive!)
  const context = parentOf(thoughts)
  const isSorted = getSortPreference(state, context).includes('Alphabetical')
  const distance = cursor ? cursor.length - thoughtsTo.length : 0
  const isHidden = distance >= 2
  const isSelf = equalPath(thoughtsTo, thoughtsFrom)
  const isDescendant = isDescendantPath(thoughtsTo, thoughtsFrom) && !isSelf
  const oldContext = rootedParentOf(state, thoughtsFrom)
  const newContext = rootedParentOf(state, thoughtsTo)
  const sameContext = equalArrays(oldContext, newContext)

  // do not drop on descendants (exclusive) or thoughts hidden by autofocus
  // allow drop on itself or after itself even though it is a noop so that drop-hover appears consistently
  return !isHidden && !isDescendant && (!isSorted || !sameContext)
}

// eslint-disable-next-line jsdoc/require-jsdoc
const drop = (props: ThoughtContainerProps, monitor: DropTargetMonitor) => {

  // no bubbling
  if (monitor.didDrop() || !monitor.isOver({ shallow: true })) return

  const state = store.getState()

  const { simplePath: thoughtsFrom } = monitor.getItem()
  const thoughtsTo = props.simplePathLive!
  const isRootOrEM = isRoot(thoughtsFrom) || isEM(thoughtsFrom)
  const oldContext = rootedParentOf(state, thoughtsFrom)
  const newContext = rootedParentOf(state, thoughtsTo)
  const sameContext = equalArrays(oldContext, newContext)

  // cannot move root or em context
  if (isRootOrEM && !sameContext) {
    store.dispatch(error({ value: `Cannot move the ${isRoot(thoughtsFrom) ? 'home' : 'em'} context to another context.` }))
    return
  }

  // drop on itself or after itself is a noop
  if (equalPath(thoughtsFrom, thoughtsTo) || isBefore(state, thoughtsFrom, thoughtsTo)) return

  const newPath = unroot(parentOf(thoughtsTo)).concat({
    value: headValue(thoughtsFrom),
    rank: getRankBefore(state, thoughtsTo)
  })

  store.dispatch(props.showContexts
    ? newThoughtSubmit({
      value: headValue(thoughtsTo),
      context: pathToContext(thoughtsFrom),
      rank: getNextRank(state, thoughtsFrom)
    })
    : existingThoughtMove({
      oldPath: thoughtsFrom,
      newPath
    })
  )

  // alert user of move to another context
  if (!sameContext) {

    // wait until after MultiGesture has cleared the error so this alert does not get cleared
    setTimeout(() => {
      const alertFrom = '"' + ellipsize(headValue(thoughtsFrom)) + '"'
      const alertTo = isRoot(newContext)
        ? 'home'
        : '"' + ellipsize(headValue(parentOf(thoughtsTo))) + '"'

      store.dispatch(alert(`${alertFrom} moved to ${alertTo} context.`))
      clearTimeout(globals.errorTimer)
      globals.errorTimer = window.setTimeout(() => store.dispatch(alert(null)), 5000)
    }, 100)
  }
}

// eslint-disable-next-line jsdoc/require-jsdoc
const dropCollect = (connect: DropTargetConnector, monitor: DropTargetMonitor) => ({
  dropTarget: connect.dropTarget(),
  isHovering: monitor.isOver({ shallow: true }) && monitor.canDrop(),
  isDeepHovering: monitor.isOver()
})

type ConnectedThoughtProps = ThoughtProps &
  Pick<ReturnType<typeof mapDispatchToProps>, 'toggleTopControlsAndBreadcrumbs'>

type ConnectedThoughtContainerProps =
  ThoughtContainerProps &
  ReturnType<typeof mapStateToProps>

type ConnectedDraggableThoughtContainerProps =
  ConnectedThoughtContainerProps &
  ReturnType<typeof dragCollect> &
  ReturnType<typeof dropCollect> &
  ReturnType<typeof mapDispatchToProps>

/**********************************************************************
 * Components
 **********************************************************************/

/** A single thought element with overlay bullet, context breadcrumbs, editable, and superscript. */
const Thought = ({
  cursorOffset,
  homeContext,
  isDragging,
  isEditing,
  isLeaf,
  hideBullet,
  path,
  publish,
  rank,
  showContextBreadcrumbs,
  showContexts,
  style,
  simplePath,
  toggleTopControlsAndBreadcrumbs
}: ConnectedThoughtProps) => {
  const isRoot = simplePath.length === 1
  const isRootChildLeaf = simplePath.length === 2 && isLeaf

  const state = store.getState()

  return <div className='thought'>

    {!(publish && (isRoot || isRootChildLeaf)) && !hideBullet && <BulletCursorOverlay simplePath={simplePath} isDragging={isDragging}/>}

    {showContextBreadcrumbs && !isRoot ? <ContextBreadcrumbs path={rootedParentOf(state, rootedParentOf(state, simplePath))} homeContext={homeContext} />
    : showContexts && simplePath.length > 2 ? <span className='ellipsis'><a tabIndex={-1}/* TODO: Add setting to enable tabIndex for accessibility */ onClick={() => {
      store.dispatch(expandContextThought(path))
    }}>... </a></span>
    : null}

    {homeContext ? <HomeLink />
    : isDivider(headValue(simplePath)) ? <Divider path={simplePath} />
    // cannot use simplePathLive here else Editable gets re-rendered during editing
    : <Editable
      path={path}
      cursorOffset={cursorOffset}
      disabled={!isDocumentEditable()}
      isEditing={isEditing}
      rank={rank}
      showContexts={showContexts}
      style={style}
      simplePath={simplePath}
      onKeyDownAction={isTouch ? undefined : toggleTopControlsAndBreadcrumbs}
    />}

    <Superscript simplePath={simplePath} showContexts={showContexts} superscript={false} />
  </div>
}

/** A thought container with bullet, thought annotation, thought, and subthoughts.
 *
  @param allowSingleContext  Pass through to Subthoughts since the SearchSubthoughts component does not have direct access to the Subthoughts of the Subthoughts of the search. Default: false.
 */
const ThoughtContainer = ({
  allowSingleContext,
  childrenForced,
  contextBinding,
  path,
  count = 0,
  cursor = [],
  cursorOffset,
  depth = 0,
  dragPreview,
  dragSource,
  dropTarget,
  expandedContextThought,
  hideBullet,
  isDeepHovering,
  isPublishChild,
  isCursorGrandparent,
  isCursorParent,
  isDraggable,
  isDragging,
  isEditing,
  isEditingPath,
  isExpanded,
  isHovering,
  isParentHovering,
  prevChild,
  publish,
  rank,
  setCursorOnNote,
  showContexts,
  style,
  thought,
  simplePath,
  simplePathLive,
  view,
  toggleTopControlsAndBreadcrumbs
}: ConnectedDraggableThoughtContainerProps) => {

  const state = store.getState()
  useEffect(() => {
    if (isHovering) {
      store.dispatch(dragInProgress({
        value: true,
        draggingThought: state.draggingThought,
        hoveringThought: [...context],
        hoveringPath: path,
        hoverId: DROP_TARGET.ThoughtDrop
      }))
    }
  }, [isHovering])

  /** Highlight bullet and show alert on long press on Thought. */
  const onLongPressStart = () => {
    if (!store.getState().dragHold) {
      store.dispatch([
        dragHold({ value: true, simplePath: simplePathLive }),
        alert('Drag and drop to move thought', { showCloseLink: false })
      ])
    }
  }

  /** Cancel highlighting of bullet and dismiss alert when long press finished. */
  const onLongPressEnd = () => {
    if (store.getState().dragHold) {
      store.dispatch([
        dragHold({ value: false }),
        alert(null),
      ])
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const longPressHandlerProps = useLongPress(onLongPressStart, onLongPressEnd, TIMEOUT_BEFORE_DRAG)

  const value = headValue(simplePathLive!)

  // if rendering as a context and the thought is the root, render home icon instead of Editable
  const homeContext = showContexts && isRoot([head(rootedParentOf(state, simplePath))])

  // prevent fading out cursor parent
  // there is a special case here for the cursor grandparent when the cursor is a leaf
  // See: <Subthoughts> render

  const children = childrenForced || getChildrenRanked(state, pathToContext(contextBinding || simplePathLive))

  const showContextBreadcrumbs = showContexts &&
    (!globals.ellipsizeContextThoughts || equalPath(path, expandedContextThought as Path | null))

  const thoughts = pathToContext(simplePath)
  const thoughtsLive = pathToContext(simplePathLive!)
  const context = parentOf(thoughts)
  const childrenOptions = getAllChildren(state, [...context, '=options'])
  const options = !isFunction(value) && childrenOptions.length > 0 ?
    childrenOptions.map(child => child.value.toLowerCase())
    : null

  const isLeaf = !hasChildren(state, thoughtsLive)

  const styleContainer = getStyle(state, thoughts, { container: true })
  const styleContainerZoom = isEditingPath ? getStyle(state, thoughts.concat('=focus', 'Zoom'), { container: true }) : null

  const cursorOnAlphabeticalSort = cursor && attributeEquals(state, context, '=sort', 'Alphabetical')

  const draggingThoughtValue = state.draggingThought
    ? head(pathToContext(state.draggingThought))
    : null

  const isAnyChildHovering = useIsChildHovering(thoughts, isHovering, isDeepHovering)

  /** Checks if any descendents of the direct siblings is being hovered. */
  const isAnySiblingDescendantHovering = () => !isHovering && state.hoveringPath && isDescendantPath(state.hoveringPath, parentOf(path)) && (state.hoveringPath.length !== path.length || state.hoverId === DROP_TARGET.EmptyDrop)

  const shouldDisplayHover = cursorOnAlphabeticalSort
    // if alphabetical sort is enabled check if drag is in progress and parent element is hovering
    ? state.dragInProgress && isParentHovering && draggingThoughtValue && !isAnySiblingDescendantHovering()
      // check if it's alphabetically previous to current thought
      && compareReasonable(draggingThoughtValue, value) <= 0
      // check if it's alphabetically next to previous thought if it exists
      && (!prevChild || compareReasonable(draggingThoughtValue, (prevChild as Child).value) === 1)
    // if alphabetical sort is disabled just check if current thought is hovering
    : globals.simulateDropHover || isHovering

  return thought ? dropTarget(dragSource(<li style={{
    ...styleContainer,
    ...styleContainerZoom,
  }} className={classNames({
    child: true,
    'child-divider': isDivider(thought!.value ?? ''),
    'cursor-parent': isCursorParent,
    'cursor-grandparent': isCursorGrandparent,
    // used so that the autofocus can properly highlight the immediate parent of the cursor
    editing: isEditing,
    expanded: isExpanded,
    'function': isFunction(value), // eslint-disable-line quote-props
    'has-only-child': children.length === 1,
    'invalid-option': options ? !options.includes(value.toLowerCase()) : null,
    // if editing and expansion is suppressed, mark as a leaf so that bullet does not show expanded
    // this is a bit of a hack since the bullet transform checks leaf instead of expanded
    // TODO: Consolidate with isLeaf if possible
    leaf: isLeaf || (isEditing && globals.suppressExpansion),
    // prose view will automatically be enabled if there enough characters in at least one of the thoughts within a context
    prose: view === 'Prose',
    'show-contexts': showContexts,
    'show-contexts-no-breadcrumbs': simplePath.length === 2,
    // must use isContextViewActive to read from live state rather than showContexts which is a static propr from the Subthoughts component. showContext is not updated when the context view is toggled, since the Thought should not be re-rendered.
    'table-view': view === 'Table' && !isContextViewActive(state, pathToContext(path)),
  })} ref={el => {
    if (el) {
      dragPreview(getEmptyImage())
    }
  }}
    // disable to test if this solves the app switch touch issue on mobile PWA
    // { ...longPressHandlerProps }
  >
    <div className='thought-container' style={hideBullet ? { marginLeft: -12 } : {}}>

      {!(publish && context.length === 0) && (!isLeaf || !isPublishChild) && !hideBullet && <Bullet isEditing={isEditing} context={pathToContext(simplePath)} leaf={isLeaf} onClick={(e: React.MouseEvent) => {
        if (!isEditing || children.length === 0) {
          e.stopPropagation()
          store.dispatch(setCursor({ path: simplePath }))
        }
      }}/>}

      <span className='drop-hover' style={{
        display: shouldDisplayHover ? 'inline' : 'none',
      }}></span>

      <ThoughtAnnotation
        path={path}
        homeContext={homeContext}
        minContexts={allowSingleContext ? 0 : 2}
        showContextBreadcrumbs={showContextBreadcrumbs}
        showContexts={showContexts}
        style={style}
        simplePath={simplePath}
      />

      <Thought
        path={path}
        cursorOffset={cursorOffset}
        hideBullet={hideBullet}
        homeContext={homeContext}
        isDraggable={isDraggable}
        isDragging={isDragging}
        isPublishChild={isPublishChild}
        isEditing={isEditing}
        isLeaf={isLeaf}
        publish={publish}
        rank={rank}
        showContextBreadcrumbs={showContextBreadcrumbs}
        showContexts={showContexts}
        style={style}
        simplePath={simplePath}
        toggleTopControlsAndBreadcrumbs={toggleTopControlsAndBreadcrumbs}
        view={view}
      />

      <Note
        context={thoughtsLive}
        onFocus={setCursorOnNote({ path: path })}
      />

    </div>

    {publish && context.length === 0 && <Byline context={thoughts} />}

    { /* Recursive Subthoughts */}
    <Subthoughts
      allowSingleContext={allowSingleContext}
      childrenForced={childrenForced}
      path={path}
      count={count}
      depth={depth}
      isParentHovering={isAnyChildHovering}
      showContexts={allowSingleContext}
      simplePath={simplePath}
      sort={attribute(store.getState(), pathToContext(simplePathLive!), '=sort') || 'None'}
    />
  </li>)) : null
}

ThoughtContainer.displayName = 'ThoughtContainer'

// export connected, drag and drop higher order thought component
const ThoughtComponent = connect(mapStateToProps, mapDispatchToProps)(DragSource('thought', { canDrag, beginDrag, endDrag }, dragCollect)(DropTarget('thought', { canDrop, drop }, dropCollect)(ThoughtContainer)))

export default ThoughtComponent
