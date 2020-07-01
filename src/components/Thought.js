import React, { useEffect } from 'react'
import { connect } from 'react-redux'
import classNames from 'classnames'
import { DragSource, DropTarget } from 'react-dnd'
import { getEmptyImage } from 'react-dnd-html5-backend'
import { isMobile } from '../browser'
import { store } from '../store'
import globals from '../globals'

// action creators
import alert from '../action-creators/alert'
import expandContextThought from '../action-creators/expandContextThought'

// components
import Bullet from './Bullet'
import BulletCursorOverlay from './BulletCursorOverlay'
import Byline from './Byline'
import Code from './Code'
import ContextBreadcrumbs from './ContextBreadcrumbs'
import Divider from './Divider'
import Editable from './Editable'
import HomeLink from './HomeLink'
import Note from './Note'
import Subthoughts from './Subthoughts'
import Superscript from './Superscript'
import ThoughtAnnotation from './ThoughtAnnotation'
import useLongPress from '../hooks/useLongPress'
import { MAX_DISTANCE_FROM_CURSOR, TIMEOUT_BEFORE_DRAG } from '../constants'

// util
import {
  clearSelection,
  contextOf,
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
  isRoot,
  isURL,
  pathToContext,
  publishMode,
  rootedContextOf,
  subsetThoughts,
  unroot,
} from '../util'

// selectors
import {
  attribute,
  attributeEquals,
  chain,
  getNextRank,
  getRankBefore,
  getSortPreference,
  getStyle,
  getThought,
  getThoughts,
  getThoughtsRanked,
  hasChild,
  isBefore,
  isContextViewActive,
} from '../selectors'

/**********************************************************************
 * Redux
 **********************************************************************/

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state, props) => {

  const {
    codeView,
    cursor,
    cursorOffset,
    cursorBeforeEdit,
    expanded,
    expandedContextThought,
    search,
    showHiddenThoughts,
  } = state

  const {
    contextChain,
    thoughtsRanked,
    showContexts,
    depth,
    childrenForced
  } = props

  // resolve thoughts that are part of a context chain (i.e. some parts of thoughts expanded in context view) to match against cursor subset
  const thoughtsResolved = props.contextChain && props.contextChain.length > 0
    ? chain(state, props.contextChain, props.thoughtsRanked)
    : unroot(props.thoughtsRanked)

  // check if the cursor path includes the current thought
  const isEditingPath = subsetThoughts(cursorBeforeEdit, thoughtsResolved)

  // check if the cursor is editing a thought directly
  const isEditing = equalPath(cursorBeforeEdit, thoughtsResolved)

  const thoughtsRankedLive = isEditing
    ? contextOf(thoughtsRanked).concat(head(showContexts ? contextOf(cursor) : cursor))
    : thoughtsRanked

  const distance = cursor ? Math.max(0,
    Math.min(MAX_DISTANCE_FROM_CURSOR, cursor.length - depth)
  ) : 0

  const isCursorParent = distance === 2
    // grandparent
    ? equalPath(rootedContextOf(contextOf(cursor || [])), chain(state, contextChain, thoughtsRanked)) && getThoughtsRanked(state, cursor).length === 0
    // parent
    : equalPath(contextOf(cursor || []), chain(state, contextChain, thoughtsRanked))

  let contextBinding // eslint-disable-line fp/no-let
  try {
    contextBinding = JSON.parse(attribute(state, thoughtsRankedLive, '=bindContext'))
  }
  catch (err) {
  }

  const isCursorGrandparent =
    equalPath(rootedContextOf(contextOf(cursor || [])), chain(state, contextChain, thoughtsRanked))
  const children = childrenForced || getThoughtsRanked(state, contextBinding || thoughtsRankedLive)

  const value = headValue(thoughtsRankedLive)

  // link URL
  const url = isURL(value) ? value :
  // if the only subthought is a url and the thought is not expanded, link the thought
    !expanded && children.length === 1 && children[0].value && isURL(children[0].value) && (!cursor || !equalPath(thoughtsRankedLive, contextOf(cursor))) ? children[0].value :
    null

  const thought = getThought(state, value)

  return {
    contextBinding,
    cursorOffset,
    distance,
    isPublishChild: !search && publishMode() && thoughtsRanked.length === 2,
    isCursorParent,
    isCursorGrandparent,
    expanded: expanded[hashContext(thoughtsResolved)],
    expandedContextThought,
    isCodeView: cursor && equalPath(codeView, props.thoughtsRanked),
    isEditing,
    isEditingPath,
    publish: !search && publishMode(),
    showHiddenThoughts,
    thought,
    thoughtsRankedLive,
    view: attribute(state, thoughtsRankedLive, '=view'),
    url,
  }
}

/**********************************************************************
 * Drag and Drop
 **********************************************************************/

// eslint-disable-next-line jsdoc/require-jsdoc
const canDrag = props => {
  const state = store.getState()
  const thoughts = pathToContext(props.thoughtsRankedLive)
  const context = contextOf(pathToContext(props.thoughtsRankedLive))
  const isDraggable = props.isDraggable || props.isCursorParent

  return isDocumentEditable() &&
    isDraggable &&
    (!isMobile || globals.touched) &&
    !hasChild(state, thoughts, '=immovable') &&
    !hasChild(state, thoughts, '=readonly') &&
    !hasChild(state, context, '=immovable') &&
    !hasChild(state, context, '=readonly')
}

// eslint-disable-next-line jsdoc/require-jsdoc
const beginDrag = ({ thoughtsRankedLive }) => {
  // disable hold-and-select on mobile
  if (isMobile) {
    setTimeout(clearSelection)
  }
  store.dispatch({
    type: 'dragInProgress',
    value: true,
    draggingThought: thoughtsRankedLive,
  })
  return { thoughtsRanked: thoughtsRankedLive }
}

// eslint-disable-next-line jsdoc/require-jsdoc
const endDrag = () => {
  setTimeout(() => {
    // re-enable hold-and-select on mobile
    if (isMobile) {
      clearSelection()
    }
    // reset dragInProgress after a delay to prevent cursor from moving
    store.dispatch({ type: 'dragInProgress', value: false })
    store.dispatch({ type: 'dragHold', value: false })
    alert(null)
  })
}

// eslint-disable-next-line jsdoc/require-jsdoc
const dragCollect = (connect, monitor) => ({
  dragSource: connect.dragSource(),
  dragPreview: connect.dragPreview(),
  isDragging: monitor.isDragging()
})

// eslint-disable-next-line jsdoc/require-jsdoc
const canDrop = (props, monitor) => {

  const state = store.getState()
  const { cursor } = state
  const { thoughtsRanked: thoughtsFrom } = monitor.getItem()
  const thoughtsTo = props.thoughtsRankedLive
  const thoughts = pathToContext(props.thoughtsRankedLive)
  const context = contextOf(thoughts)
  const isSorted = getSortPreference(state, context).includes('Alphabetical')
  const distance = cursor ? cursor.length - thoughtsTo.length : 0
  const isHidden = distance >= 2
  const isSelf = equalPath(thoughtsTo, thoughtsFrom)
  const isDescendant = subsetThoughts(thoughtsTo, thoughtsFrom) && !isSelf
  const oldContext = rootedContextOf(thoughtsFrom)
  const newContext = rootedContextOf(thoughtsTo)
  const sameContext = equalArrays(oldContext, newContext)

  // do not drop on descendants (exclusive) or thoughts hidden by autofocus
  // allow drop on itself or after itself even though it is a noop so that drop-hover appears consistently
  return !isHidden && !isDescendant && (!isSorted || !sameContext)
}

// eslint-disable-next-line jsdoc/require-jsdoc
const drop = (props, monitor, component) => {

  // no bubbling
  if (monitor.didDrop() || !monitor.isOver({ shallow: true })) return

  const state = store.getState()

  const { thoughtsRanked: thoughtsFrom } = monitor.getItem()
  const thoughtsTo = props.thoughtsRankedLive
  const isRootOrEM = isRoot(thoughtsFrom) || isEM(thoughtsFrom)
  const oldContext = rootedContextOf(thoughtsFrom)
  const newContext = rootedContextOf(thoughtsTo)
  const sameContext = equalArrays(oldContext, newContext)

  // cannot move root or em context or target is divider
  if (isDivider(headValue(thoughtsTo)) || (isRootOrEM && !sameContext)) {
    store.dispatch({ type: 'error', value: `Cannot move the ${isRoot(thoughtsFrom) ? 'home' : 'em'} context to another context.` })
    return
  }

  // drop on itself or after itself is a noop
  if (equalPath(thoughtsFrom, thoughtsTo) || isBefore(state, thoughtsFrom, thoughtsTo)) return

  const newPath = unroot(contextOf(thoughtsTo)).concat({
    value: headValue(thoughtsFrom),
    rank: getRankBefore(state, thoughtsTo)
  })

  store.dispatch(props.showContexts
    ? {
      type: 'newThoughtSubmit',
      value: headValue(thoughtsTo),
      context: pathToContext(thoughtsFrom),
      rank: getNextRank(state, thoughtsFrom)
    }
    : {
      type: 'existingThoughtMove',
      oldPath: thoughtsFrom,
      newPath
    }
  )

  // alert user of move to another context
  if (!sameContext) {

    // wait until after MultiGesture has cleared the error so this alert does not get cleared
    setTimeout(() => {
      const alertFrom = '"' + ellipsize(headValue(thoughtsFrom)) + '"'
      const alertTo = isRoot(newContext)
        ? 'home'
        : '"' + ellipsize(headValue(contextOf(thoughtsTo))) + '"'

      alert(`${alertFrom} moved to ${alertTo} context.`)
      clearTimeout(globals.errorTimer)
      globals.errorTimer = window.setTimeout(() => alert(null), 5000)
    }, 100)
  }
}

// eslint-disable-next-line jsdoc/require-jsdoc
const dropCollect = (connect, monitor) => ({
  dropTarget: connect.dropTarget(),
  isHovering: monitor.isOver({ shallow: true }) && monitor.canDrop(),
  isDeepHovering: monitor.isOver()
})

/**********************************************************************
 * Components
 **********************************************************************/

/** A single thought element with overlay bullet, context breadcrumbs, editable, and superscript. */
const Thought = ({
  contextChain,
  cursorOffset,
  homeContext,
  isDragging,
  isPublishChild,
  isEditing,
  isLeaf,
  hideBullet,
  publish,
  rank,
  showContextBreadcrumbs,
  showContexts,
  style,
  thoughtsRanked,
  view,
  noteFocus
}) => {

  const isRoot = thoughtsRanked.length === 1
  const isRootChildLeaf = thoughtsRanked.length === 2 && isLeaf

  return <div className='thought' style={homeContext ? { height: '1em', marginLeft: 8 } : null}>

    {!(publish && (isRoot || isRootChildLeaf)) && !hideBullet && <BulletCursorOverlay thoughtsRanked={thoughtsRanked} isDragging={isDragging}/>}

    {showContextBreadcrumbs ? <ContextBreadcrumbs thoughtsRanked={contextOf(contextOf(thoughtsRanked))} showContexts={showContexts} />
    : showContexts && thoughtsRanked.length > 2 ? <span className='ellipsis'><a tabIndex='-1'/* TODO: Add setting to enable tabIndex for accessibility */ onClick={() => {
      store.dispatch(expandContextThought(thoughtsRanked))
    }}>... </a></span>
    : null}

    {homeContext ? <HomeLink />
    : isDivider(headValue(thoughtsRanked)) ? <Divider thoughtsRanked={thoughtsRanked} />
    // cannot use thoughtsRankedLive here else Editable gets re-rendered during editing
    : <Editable
      contextChain={contextChain}
      cursorOffset={cursorOffset}
      disabled={!isDocumentEditable()}
      isEditing={isEditing}
      rank={rank}
      showContexts={showContexts}
      style={style}
      thoughtsRanked={thoughtsRanked}
    />}

    <Superscript thoughtsRanked={thoughtsRanked} showContexts={showContexts} contextChain={contextChain} superscript={false} />
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
  contextChain,
  count = 0,
  cursor = [],
  cursorOffset,
  depth = 0,
  dispatch,
  distance,
  dragPreview,
  dragSource,
  dropTarget,
  expanded,
  expandedContextThought,
  hideBullet,
  isDeepHovering,
  isPublishChild,
  isCodeView,
  isCursorGrandparent,
  isCursorParent,
  isDraggable,
  isDragging,
  isEditing,
  isEditingPath,
  isHovering,
  isParentHovering,
  prevChild,
  publish,
  rank,
  showContexts,
  showHiddenThoughts,
  style,
  thought,
  thoughtsRanked,
  thoughtsRankedLive,
  url,
  view,
}) => {

  const state = store.getState()
  useEffect(() => {
    if (isHovering) {
      store.dispatch({
        type: 'dragInProgress',
        value: true,
        draggingThought: state.draggingThought,
        hoveringThought: [...context]
      })
    }
  }, [isHovering])

  /** Highlight bullet and show alert on long press on Thought. */
  const onLongPressStart = () => {
    if (!store.getState().dragHold) {
      store.dispatch({ type: 'dragHold', value: true, draggedThoughtsRanked: thoughtsRankedLive })
      alert('Drag and drop to move thought', { showCloseLink: false })
    }
  }

  /** Cancel highlighting of bullet and dismiss alert when long press finished. */
  const onLongPressEnd = () => {
    if (store.getState().dragHold) {
      store.dispatch({ type: 'dragHold', value: false })
      alert(null)
    }
  }

  const longPressHandlerProps = useLongPress(onLongPressStart, onLongPressEnd, TIMEOUT_BEFORE_DRAG)

  // resolve thoughts that are part of a context chain (i.e. some parts of thoughts expanded in context view) to match against cursor subset
  const thoughtsResolved = contextChain && contextChain.length > 0
    ? chain(state, contextChain, thoughtsRanked)
    : unroot(thoughtsRanked)

  const value = headValue(thoughtsRankedLive)

  // if rendering as a context and the thought is the root, render home icon instead of Editable
  const homeContext = showContexts && isRoot([head(contextOf(thoughtsRanked))])

  // prevent fading out cursor parent
  // there is a special case here for the cursor grandparent when the cursor is a leaf
  // See: <Subthoughts> render

  const children = childrenForced || getThoughtsRanked(state, contextBinding || thoughtsRankedLive)

  // in the Context View, perform a data integrity check to confirm that the thought is in thoughtIndex
  const contextThought = showContexts && getThought(state, headValue(contextOf(thoughtsRanked)))

  const showContextBreadcrumbs = showContexts &&
    (!globals.ellipsizeContextThoughts || equalPath(thoughtsRanked, expandedContextThought)) &&
    thoughtsRanked.length > 2

  const thoughts = pathToContext(thoughtsRanked)
  const thoughtsLive = pathToContext(thoughtsRankedLive)
  const context = contextOf(thoughts)
  const childrenOptions = getThoughts(state, [...context, 'Options'])
  const options = !isFunction(value) && childrenOptions.length > 0 ?
    childrenOptions.map(s => s.toLowerCase())
    : null

  const isLeaf = showHiddenThoughts
    ? children.length === 0
    : !children.some(child => !isFunction(child.value) && !hasChild(state, thoughts.concat(child.value), '=hidden'))

  const styleContainer = getStyle(state, thoughts, { container: true })
  const styleContainerZoom = isEditingPath ? getStyle(state, thoughts.concat('=focus', 'Zoom'), { container: true }) : null

  const cursorOnAlphabeticalSort = cursor && attributeEquals(state, context, '=sort', 'Alphabetical')

  const draggingThoughtContext = pathToContext(state.draggingThought)
  const draggingThoughtValue = draggingThoughtContext && head(draggingThoughtContext)

  // check if hovering thought context matches current thought
  const isAnyChildHovering = isDeepHovering && !isHovering && state.hoveringThought
    && thoughts.length === state.hoveringThought.length
    && state.hoveringThought.every((thought, index) => thought === thoughts[index])

  const shouldDisplayHover = cursorOnAlphabeticalSort
    // if alphabetical sort is enabled check if drag is in progress and parent element is hovering
    ? state.dragInProgress && isParentHovering
      // check if it's alphabetically previous to current thought
      && draggingThoughtValue <= value
      // check if it's alphabetically next to previous thought if it exists
      && (!prevChild || draggingThoughtValue > prevChild.value)
    // if alphabetical sort is disabled just check if current thought is hovering
    : globals.simulateDropHover || isHovering

  return thought ? dropTarget(dragSource(<li style={{
    ...styleContainer,
    ...styleContainerZoom,
  }} className={classNames({
    child: true,
    'child-divider': isDivider(thought.value),
    'cursor-parent': isCursorParent,
    'cursor-grandparent': isCursorGrandparent,
    'code-view': isCodeView,
    // used so that the autofocus can properly highlight the immediate parent of the cursor
    editing: isEditing,
    expanded,
    'function': isFunction(value), // eslint-disable-line quote-props
    'has-only-child': children.length === 1,
    'invalid-option': options ? !options.includes(value.toLowerCase()) : null,
    // if editing and expansion is suppressed, mark as a leaf so that bullet does not show expanded
    // this is a bit of a hack since the bullet transform checks leaf instead of expanded
    // TODO: Consolidate with isLeaf if possible
    leaf: isLeaf || (isEditing && globals.suppressExpansion),
    // prose view will automatically be enabled if there enough characters in at least one of the thoughts within a context
    prose: view === 'Prose',
    // must use isContextViewActive to read from live state rather than showContexts which is a static propr from the Subthoughts component. showContext is not updated when the context view is toggled, since the Thought should not be re-rendered.
    'show-contexts': showContexts,
    'table-view': view === 'Table' && !isContextViewActive(state, thoughtsResolved),
  })} ref={el => {
    if (el) {
      dragPreview(getEmptyImage())
    }
  }} {...longPressHandlerProps}>
    <div className='thought-container' style={hideBullet ? { marginLeft: -12 } : null}>

      {!(publish && context.length === 0) && (!isLeaf || !isPublishChild) && !hideBullet && <Bullet isEditing={isEditing} thoughtsResolved={thoughtsResolved} leaf={isLeaf} glyph={showContexts && !contextThought ? '✕' : null} onClick={e => {
        if (!isEditing || children.length === 0) {
          e.stopPropagation()
          store.dispatch({
            type: 'setCursor',
            thoughtsRanked,
          })
        }
      }}/>}

      <span className='drop-hover' style={{ display: shouldDisplayHover ? 'inline' : 'none' }}></span>

      <ThoughtAnnotation
        contextChain={contextChain}
        homeContext={homeContext}
        minContexts={allowSingleContext ? 0 : 2}
        showContextBreadcrumbs={showContextBreadcrumbs}
        showContexts={showContexts}
        style={style}
        thoughtsRanked={thoughtsRanked}
        url={url}
      />

      <Thought
        contextChain={contextChain}
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
        thoughtsRanked={thoughtsRanked}
        view={view}
      />

      <Note context={thoughtsLive} thoughtsRanked={thoughtsRankedLive} contextChain={contextChain}/>

    </div>

    {isCodeView ? <Code thoughtsRanked={thoughtsRanked} /> : null}

    {publish && context.length === 0 && <Byline context={thoughts} />}

    { /* Recursive Subthoughts */}
    <Subthoughts
      thoughtsRanked={thoughtsRanked}
      childrenForced={childrenForced}
      count={count}
      depth={depth}
      contextChain={contextChain}
      allowSingleContext={allowSingleContext}
      isParentHovering={isAnyChildHovering}
      showContexts={allowSingleContext}
      sort={attribute(store.getState(), thoughtsRankedLive, '=sort')}
    />
  </li>)) : null
}

// export connected, drag and drop higher order thought component
const ThoughtComponent = connect(mapStateToProps)(DragSource('thought', { canDrag, beginDrag, endDrag }, dragCollect)(DropTarget('thought', { canDrop, drop }, dropCollect)(ThoughtContainer)))

export default ThoughtComponent
