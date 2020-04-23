import React from 'react'
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

// constants
import {
  MAX_DISTANCE_FROM_CURSOR,
} from '../constants'

// util
import {
  attribute,
  autoProse,
  chain,
  contextOf,
  ellipsize,
  equalArrays,
  equalPath,
  getNextRank,
  getRankBefore,
  getSortPreference,
  getThought,
  getThoughtsRanked,
  hashContext,
  head,
  headValue,
  isBefore,
  isContextViewActive,
  isDivider,
  isDocumentEditable,
  isEM,
  isFunction,
  isRoot,
  isURL,
  meta,
  pathToContext,
  publishMode,
  rootedContextOf,
  subsetThoughts,
  unroot,
} from '../util'

/**********************************************************************
 * Redux
 **********************************************************************/

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
    ? chain(props.contextChain, props.thoughtsRanked)
    : unroot(props.thoughtsRanked)

  // check if the cursor path includes the current thought
  // check if the cursor is editing an thought directly
  const isEditing = equalPath(cursorBeforeEdit, thoughtsResolved)
  const thoughtsRankedLive = isEditing
    ? contextOf(thoughtsRanked).concat(head(showContexts ? contextOf(cursor) : cursor))
    : thoughtsRanked

  const distance = cursor ? Math.max(0,
    Math.min(MAX_DISTANCE_FROM_CURSOR, cursor.length - depth)
  ) : 0

  const isCursorParent = distance === 2
    // grandparent
    ? equalPath(rootedContextOf(contextOf(cursor || [])), chain(contextChain, thoughtsRanked)) && getThoughtsRanked(cursor).length === 0
    // parent
    : equalPath(contextOf(cursor || []), chain(contextChain, thoughtsRanked))

  let contextBinding // eslint-disable-line fp/no-let
  try {
    contextBinding = JSON.parse(attribute(thoughtsRankedLive, '=bindContext'))
  }
  catch (err) {
  }

  const isCursorGrandparent =
    equalPath(rootedContextOf(contextOf(cursor || [])), chain(contextChain, thoughtsRanked))
  const children = childrenForced || getThoughtsRanked(contextBinding || thoughtsRankedLive)

  const value = headValue(thoughtsRankedLive)

  // link URL
  const url = isURL(value) ? value :
  // if the only subthought is a url and the thought is not expanded, link the thought
    !expanded && children.length === 1 && children[0].value && isURL(children[0].value) && (!cursor || !equalPath(thoughtsRankedLive, contextOf(cursor))) ? children[0].value :
    null

  const thought = getThought(value)

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
    publish: !search && publishMode(),
    showHiddenThoughts,
    thought,
    thoughtsRankedLive,
    view: attribute(thoughtsRankedLive, '=view'),
    url,
  }
}

/**********************************************************************
 * Drag and Drop
 **********************************************************************/

const canDrag = props => {

  const thoughtMeta = meta(pathToContext(props.thoughtsRankedLive))
  const contextMeta = meta(contextOf(pathToContext(props.thoughtsRankedLive)))
  const isDraggable = props.isDraggable || props.isCursorParent
  return isDocumentEditable() &&
    isDraggable &&
    (!isMobile || globals.touched) &&
    !thoughtMeta.immovable &&
    !thoughtMeta.readonly &&
    !(contextMeta.readonly && contextMeta.readonly.Subthoughts) &&
    !(contextMeta.immovable && contextMeta.immovable.Subthoughts)
}

const beginDrag = props => {

  store.dispatch({ type: 'dragInProgress', value: true })

  // disable hold-and-select on mobile
  if (isMobile) {
    setTimeout(() => {
      document.getSelection().removeAllRanges()
    })
  }
  return { thoughtsRanked: props.thoughtsRankedLive }
}

const endDrag = () => {
  setTimeout(() => {
    // re-enable hold-and-select on mobile
    if (isMobile) {
      document.getSelection().removeAllRanges()
    }
    // reset dragInProgress after a delay to prevent cursor from moving
    store.dispatch({ type: 'dragInProgress', value: false })
  })
}

const dragCollect = (connect, monitor) => ({
  dragSource: connect.dragSource(),
  dragPreview: connect.dragPreview(),
  isDragging: monitor.isDragging()
})

const canDrop = (props, monitor) => {

  const { thoughtsRanked: thoughtsFrom } = monitor.getItem()
  const thoughtsTo = props.thoughtsRankedLive
  const contextMeta = meta(contextOf(pathToContext(props.thoughtsRankedLive)))
  const isSorted = getSortPreference(contextMeta) === 'Alphabetical'
  const cursor = store.getState().cursor
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

const drop = (props, monitor, component) => {

  // no bubbling
  if (monitor.didDrop() || !monitor.isOver({ shallow: true })) return

  const { thoughtsRanked: thoughtsFrom } = monitor.getItem()
  const thoughtsTo = props.thoughtsRankedLive
  const isRootOrEM = isRoot(thoughtsFrom) || isEM(thoughtsFrom)
  const oldContext = rootedContextOf(thoughtsFrom)
  const newContext = rootedContextOf(thoughtsTo)
  const sameContext = equalArrays(oldContext, newContext)

  // cannot move root or em context or target is divider
  if (isDivider(headValue(thoughtsTo)) || (isRootOrEM && !sameContext)) {
    store.dispatch({
      type: 'error',
      value: `Cannot move the ${isRoot(thoughtsFrom) ? 'home' : 'em'} context to another context.`
    })
    return
  }

  // drop on itself or after itself is a noop
  if (equalPath(thoughtsFrom, thoughtsTo) || isBefore(thoughtsFrom, thoughtsTo)) return

  const newPath = unroot(contextOf(thoughtsTo)).concat({
    value: headValue(thoughtsFrom),
    rank: getRankBefore(thoughtsTo)
  })

  store.dispatch(props.showContexts
    ? {
      type: 'newThoughtSubmit',
      value: headValue(thoughtsTo),
      context: pathToContext(thoughtsFrom),
      rank: getNextRank(thoughtsFrom)
    }
    : {
      type: 'existingThoughtMove',
      oldPath: thoughtsFrom,
      newPath
    }
  )

  // alert user of move to another context
  if (!sameContext) {

    // wait until after MultiGesture has cleared the error so this alert does no get cleared
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

const dropCollect = (connect, monitor) => ({
  dropTarget: connect.dropTarget(),
  isHovering: monitor.isOver({ shallow: true }) && monitor.canDrop()
})

/**********************************************************************
 * Components
 **********************************************************************/

/* A single thought element with overlay bullet, context breadcrumbs, editable, and superscript */
const Thought = ({
  contextChain,
  cursorOffset,
  homeContext,
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
}) => {

  const isRoot = thoughtsRanked.length === 1
  const isRootChildLeaf = thoughtsRanked.length === 2 && isLeaf

  return <div className='thought' style={homeContext ? { height: '1em', marginLeft: 8 } : null}>

    {(!publish || (!isRoot && !isRootChildLeaf)) && !hideBullet && <span className='bullet-cursor-overlay'>•</span>}

    {showContextBreadcrumbs ? <ContextBreadcrumbs thoughtsRanked={contextOf(contextOf(thoughtsRanked))} showContexts={showContexts} />
    : showContexts && thoughtsRanked.length > 2 ? <span className='ellipsis'><a tabIndex='-1'/* TODO: Add setting to enable tabIndex for accessibility */ onClick={() => {
      expandContextThought(thoughtsRanked)
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
  isPublishChild,
  isCodeView,
  isCursorGrandparent,
  isCursorParent,
  isDraggable,
  isDragging,
  isEditing,
  isHovering,
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

  // resolve thoughts that are part of a context chain (i.e. some parts of thoughts expanded in context view) to match against cursor subset
  const thoughtsResolved = contextChain && contextChain.length > 0
    ? chain(contextChain, thoughtsRanked)
    : unroot(thoughtsRanked)

  const value = headValue(thoughtsRankedLive)

  // if rendering as a context and the thought is the root, render home icon instead of Editable
  const homeContext = showContexts && isRoot([head(contextOf(thoughtsRanked))])

  // prevent fading out cursor parent
  // there is a special case here for the cursor grandparent when the cursor is a leaf
  // See: <Subthoughts> render

  const children = childrenForced || getThoughtsRanked(contextBinding || thoughtsRankedLive)

  // in the Context View, perform a data integrity check to confirm that the thought is in thoughtIndex
  const contextThought = showContexts && getThought(headValue(contextOf(thoughtsRanked)))

  const showContextBreadcrumbs = showContexts &&
    (!globals.ellipsizeContextThoughts || equalPath(thoughtsRanked, expandedContextThought)) &&
    thoughtsRanked.length > 2

  const thoughts = pathToContext(thoughtsRanked)
  const context = contextOf(thoughts)
  const contextMeta = meta(context)
  const options = !isFunction(value) && contextMeta.options ? Object.keys(contextMeta.options)
    .map(s => s.toLowerCase())
    : null

  const isLeaf = (showHiddenThoughts
    ? children.length === 0
    : !children.some(child => !isFunction(child.value) && !meta(pathToContext(thoughtsRanked).concat(child.value)).hidden))

  return thought ? dropTarget(dragSource(<li className={classNames({
    child: true,
    'child-divider': isDivider(thought.value),
    'cursor-parent': isCursorParent,
    'cursor-grandparent': isCursorGrandparent,
    'code-view': isCodeView,
    dragging: isDragging,
    // used so that the autofocus can properly highlight the immediate parent of the cursor
    editing: isEditing,
    expanded,
    'function': isFunction(value), // eslint-disable-line quote-props
    'has-only-child': children.length === 1,
    'invalid-option': options ? !options.includes(value.toLowerCase()) : null,
    // if editing and expansion is suppressed, mark as a leaf so that bullet does not show expanded
    // this is a bit of a hack since the bullet transform checks leaf instead of expanded
    // TODO: Consolidate with isLeaf if possible
    leaf: children.length === 0 || (isEditing && globals.suppressExpansion),
    // prose view will automatically be enabled if there enough characters in at least one of the thoughts within a context
    prose: view === 'Prose' || autoProse(thoughtsRankedLive, null, null, { childrenForced }),
    // must use isContextViewActive to read from live state rather than showContexts which is a static propr from the Subthoughts component. showContext is not updated when the context view is toggled, since the Thought should not be re-rendered.
    'show-contexts': showContexts,
    'table-view': view === 'Table' && !isContextViewActive(thoughtsResolved),
  })} ref={el => {
    if (el) {
      dragPreview(getEmptyImage())
    }
  }}>
    <div className='thought-container' style={hideBullet ? { marginLeft: -12 } : null}>

      {!(publish && context.length === 0) && (!isLeaf || !isPublishChild) && !hideBullet && <Bullet isEditing={isEditing} thoughtsResolved={thoughtsResolved} leaf={isLeaf} glyph={showContexts && !contextThought ? '✕' : null} onClick={e => {
        if (!isEditing || children.length === 0) {
          e.stopPropagation()
          store.dispatch({
            type: 'setCursor',
            thoughtsRanked,
          })
        }
      }} />}

      <span className='drop-hover' style={{ display: globals.simulateDropHover || isHovering ? 'inline' : 'none' }}></span>

      <ThoughtAnnotation
        contextChain={contextChain}
        homeContext={homeContext}
        minContexts={allowSingleContext ? 0 : 2}
        showContextBreadcrumbs={showContextBreadcrumbs}
        showContexts={showContexts}
        thoughtsRanked={thoughtsRanked}
        url={url}
      />

      <Thought
        contextChain={contextChain}
        cursorOffset={cursorOffset}
        hideBullet={hideBullet}
        homeContext={homeContext}
        isDraggable={isDraggable}
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

      <Note context={pathToContext(thoughtsRanked)} />

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
      showContexts={allowSingleContext}
      sort={attribute(thoughtsRankedLive, '=sort')}
    />
  </li>)) : null
}

// export connected, drag and drop higher order thought component
const ThoughtComponent = connect(mapStateToProps)(DragSource('thought', { canDrag, beginDrag, endDrag }, dragCollect)(DropTarget('thought', { canDrop, drop }, dropCollect)(ThoughtContainer)))

export default ThoughtComponent
