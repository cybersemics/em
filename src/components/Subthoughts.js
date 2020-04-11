import React, { useState } from 'react'
import { connect } from 'react-redux'
import classNames from 'classnames'
import assert from 'assert'
import evaluate from 'static-eval'
import { DropTarget } from 'react-dnd'
import { store } from '../store'
import { isMobile } from '../browser'
import { formatKeyboardShortcut, shortcutById } from '../shortcuts'
import globals from '../globals'

// constants
import {
  MAX_DEPTH,
  MAX_DISTANCE_FROM_CURSOR,
  RANKED_ROOT,
} from '../constants'

// util
import {
  attribute,
  chain,
  checkIfPathShareSubcontext,
  contextOf,
  ellipsize,
  equalArrays,
  equalPath,
  equalThoughtRanked,
  getChildPath,
  getContextsSortedAndRanked,
  getNextRank,
  getSetting,
  getThought,
  getThoughtsRanked,
  getThoughtsSorted,
  hashContext,
  head,
  headValue,
  isContextViewActive,
  isDivider,
  isEM,
  isFunction,
  isRoot,
  meta,
  pathToContext,
  rankThoughtsSequential,
  rootedContextOf,
  subsetThoughts,
  sumSubthoughtsLength,
  unroot,
} from '../util'

// components
import Thought from './Thought'
import GestureDiagram from './GestureDiagram'

// action-creators
import alert from '../action-creators/alert'

const parse = require('esprima').parse

// assert shortcuts at load time
const subthoughtShortcut = shortcutById('newSubthought')
const toggleContextViewShortcut = shortcutById('toggleContextView')
assert(subthoughtShortcut)
assert(toggleContextViewShortcut)

const PAGINATION_SIZE = 100

/********************************************************************
 * mapStateToProps
 ********************************************************************/

const mapStateToProps = ({
  contextViews,
  cursor,
  cursorBeforeEdit,
  dataNonce,
  showHiddenThoughts,
  thoughtIndex,
}, props) => {

  // resolve thoughts that are part of a context chain (i.e. some parts of thoughts expanded in context view) to match against cursor subset
  const thoughtsResolved = props.contextChain && props.contextChain.length > 0
    ? chain(props.contextChain, props.thoughtsRanked)
    : unroot(props.thoughtsRanked)

  // check if the cursor path includes the current thought
  // check if the cursor is editing an thought directly
  const isEditingPath = subsetThoughts(cursorBeforeEdit, thoughtsResolved)
  const isEditing = equalPath(cursorBeforeEdit, thoughtsResolved)

  const thoughtsResolvedLive = isEditing ? cursor : thoughtsResolved
  const showContexts = props.showContexts || isContextViewActive(thoughtsResolvedLive, { state: store.getState() })
  const showContextsParent = isContextViewActive(contextOf(thoughtsResolvedLive), { state: store.getState() })
  const thoughtsRanked = showContexts && showContextsParent
    ? contextOf(props.thoughtsRanked)
    : props.thoughtsRanked

  // use live thoughts if editing
  // if editing, replace the head with the live value from the cursor
  const thoughtsRankedLive = isEditing && props.contextChain.length === 0
    ? contextOf(props.thoughtsRanked).concat(head(cursor))
    : thoughtsRanked

  let contextBinding // eslint-disable-line fp/no-let
  try {
    contextBinding = JSON.parse(attribute(thoughtsRankedLive, '=bindContext'))
  }
  catch (err) {
  }

  return {
    contextBinding,
    dataNonce,
    isEditingAncestor: isEditingPath && !isEditing,
    showContexts,
    showHiddenThoughts,
    thoughtsRanked: thoughtsRankedLive,
  }
}

/********************************************************************
 * Drag and Drop
 ********************************************************************/

// dropping at end of list requires different logic since the default drop moves the dragged thought before the drop target
const canDrop = (props, monitor) => {

  const { thoughtsRanked: thoughtsFrom } = monitor.getItem()
  const thoughtsTo = props.thoughtsRanked
  const cursor = store.getState().cursor
  const distance = cursor ? cursor.length - thoughtsTo.length : 0
  const isHidden = distance >= 2
  // there is no self thought to check since this is <Subthoughts>
  const isDescendant = subsetThoughts(thoughtsTo, thoughtsFrom)

  // do not drop on descendants or thoughts hidden by autofocus
  return !isHidden && !isDescendant
}

const drop = (props, monitor, component) => {

  // no bubbling
  if (monitor.didDrop() || !monitor.isOver({ shallow: true })) return

  const { thoughtsRanked: thoughtsFrom } = monitor.getItem()
  const thoughtsTo = props.thoughtsRanked

  const newPath = unroot(thoughtsTo).concat({
    value: headValue(thoughtsFrom),
    rank: getNextRank(thoughtsTo)
  })

  const isRootOrEM = isRoot(thoughtsFrom) || isEM(thoughtsFrom)
  const oldContext = rootedContextOf(thoughtsFrom)
  const newContext = rootedContextOf(pathToContext(newPath))
  const sameContext = equalArrays(oldContext, newContext)

  // cannot drop on itself
  if (equalPath(thoughtsFrom, newPath)) return

  // cannot move root or em context or target is divider
  if (isDivider(headValue(thoughtsTo)) || (isRootOrEM && !sameContext)) {
    store.dispatch({
      type: 'error',
      value: `Cannot move the ${isEM(thoughtsFrom) ? 'em' : 'home'} context to another context.`
    })
    return
  }

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
  // wait until after MultiGesture has cleared the error so this alert does no get cleared
  setTimeout(() => {
    const alertFrom = '"' + ellipsize(headValue(thoughtsFrom)) + '"'
    const alertTo = isRoot(newContext)
      ? 'home'
      : '"' + ellipsize(headValue(thoughtsTo)) + '"'

    alert(`${alertFrom} moved to ${alertTo} context.`)
    clearTimeout(globals.errorTimer)
    globals.errorTimer = window.setTimeout(() => alert(null), 5000)
  }, 100)
}

const dropCollect = (connect, monitor) => ({
  dropTarget: connect.dropTarget(),
  isDragInProgress: monitor.getItem(),
  isHovering: monitor.isOver({ shallow: true }) && monitor.canDrop()
})

const evalCode = ({ thoughtsRanked }) => {

  let codeResults // eslint-disable-line fp/no-let
  let ast // eslint-disable-line fp/no-let

  const { thoughtIndex } = store.getState()
  const thought = getThought(headValue(thoughtsRanked), 1)

  // ignore parse errors
  try {
    ast = parse(thought.code).body[0].expression
  }
  catch (e) {
  }

  try {
    const env = {
      // find: predicate => Object.keys(thoughtIndex).find(key => predicate(getThought(key, thoughtIndex))),
      find: predicate => rankThoughtsSequential(Object.keys(thoughtIndex).filter(predicate)),
      findOne: predicate => Object.keys(thoughtIndex).find(predicate),
      home: () => getThoughtsRanked(RANKED_ROOT),
      thoughtInContext: getThoughtsRanked,
      thought: Object.assign({}, getThought(headValue(thoughtsRanked), thoughtIndex), {
        children: () => getThoughtsRanked(thoughtsRanked)
      })
    }
    codeResults = evaluate(ast, env)

    // validate that each thought is ranked
    if (codeResults && codeResults.length > 0) {
      codeResults.forEach(thought => {
        assert(thought)
        assert.notStrictEqual(thought.value, undefined)
      })
    }
  }
  catch (e) {
    store.dispatch({ type: 'error', value: e.message })
    console.error('Dynamic Context Execution Error', e.message)
    codeResults = null
  }
}

/********************************************************************
 * Component
 ********************************************************************/

const NoChildren = ({ allowSingleContext, children, thoughtsRanked }) =>
  <div className='children-subheading text-note text-small'>

    This thought is not found in any {children.length === 0 ? '' : 'other'} contexts.<br /><br />

    <span>{isMobile
      ? <span className='gesture-container'>Swipe <GestureDiagram path={subthoughtShortcut.gesture} size='30' color='darkgray' /></span>
      : <span>Type {formatKeyboardShortcut(subthoughtShortcut.keyboard)}</span>
    } to add "{headValue(thoughtsRanked)}" to a new context.
    </span>

    <br />{allowSingleContext
      ? 'A floating context... how interesting.'
      : <span>{isMobile
        ? <span className='gesture-container'>Swipe <GestureDiagram path={toggleContextViewShortcut.gesture} size='30' color='darkgray'/* mtach .children-subheading color */ /></span>
        : <span>Type {formatKeyboardShortcut(toggleContextViewShortcut.keyboard)}</span>
      } to return to the normal view.</span>
    }
  </div>

const EmptyChildrenDropTarget = ({ depth, dropTarget, isDragInProgress, isHovering }) =>
  <ul className='empty-children' style={{ display: globals.simulateDrag || isDragInProgress ? 'block' : 'none' }}>
    {dropTarget(
      <li className={classNames({
        child: true,
        'drop-end': true,
        last: depth === 0
      })}>
        <span className='drop-hover' style={{ display: globals.simulateDropHover || isHovering ? 'inline' : 'none' }}></span>
      </li>
    )}
  </ul>

const SubthoughtsComponent = ({
  allowSingleContext,
  allowSingleContextParent,
  childrenForced,
  contextBinding,
  contextChain = [],
  count = 0,
  dataNonce,
  depth = 0,
  dropTarget,
  expandable,
  isDragInProgress,
  isEditingAncestor,
  isHovering,
  showContexts,
  showHiddenThoughts,
  sort: contextSort,
  thoughtsRanked,
}) => {

  // <Subthoughts> render
  const [page, setPage] = useState(1)

  const globalSort = getSetting(['Global Sort']) || 'None'
  const sortPreference = contextSort || globalSort
  const { cursor } = store.getState()
  const thought = getThought(headValue(thoughtsRanked), 1)
  // If the cursor is a leaf, treat its length as -1 so that the autofocus stays one level zoomed out.
  // This feels more intuitive and stable for moving the cursor in and out of leaves.
  // In this case, the grandparent must be given the cursor-parent className so it is not hidden (below)
  const cursorDepth = cursor
    ? cursor.length - (getThoughtsRanked(cursor).length === 0 ? 1 : 0)
    : 0
  const distance = cursor ? Math.max(0,
    Math.min(MAX_DISTANCE_FROM_CURSOR, cursorDepth - depth)
  ) : 0

  // resolve thoughts that are part of a context chain (i.e. some parts of thoughts expanded in context view) to match against cursor subset
  const thoughtsResolved = contextChain && contextChain.length > 0
    ? chain(contextChain, thoughtsRanked)
    : unroot(thoughtsRanked)

  const codeResults = thought && thought.code ? evalCode({ thought, thoughtsRanked }) : null

  const show = depth < MAX_DEPTH && (isRoot(thoughtsRanked) || isEditingAncestor || store.getState().expanded[hashContext(thoughtsResolved)])

  // disable intrathought linking until add, edit, delete, and expansion can be implemented
  // const subthought = perma(() => getSubthoughtUnderSelection(headValue(thoughtsRanked), 3))

  const children = childrenForced ? childrenForced // eslint-disable-line no-unneeded-ternary
    : codeResults && codeResults.length && codeResults[0] && codeResults[0].value ? codeResults
    : showContexts ? getContextsSortedAndRanked(/* subthought() || */headValue(thoughtsRanked))
    : sortPreference === 'Alphabetical' ? getThoughtsSorted(contextBinding || thoughtsRanked)
    : getThoughtsRanked(contextBinding || thoughtsRanked)

  // check duplicate ranks for debugging
  // React prints a warning, but it does not show which thoughts are colliding
  if (globals.checkDuplicateRanks) {
    children.reduce((accum, child) => {
      const match = accum[child.rank]
      if (match) {
        console.warn('Duplicate child rank', match[0], child)
        console.warn('thoughtsRanked', thoughtsRanked)
      }
      return {
        ...accum,
        [child.rank]: (match || []).concat(child)
      }
    }, {})
  }

  // Ensure that editable newThought is visible.
  const editIndex = (cursor && children && show) ? children.findIndex(child => {
    return cursor[depth] && cursor[depth].rank === child.rank
  }) : 0
  const filteredChildren = children.filter(child => {
    const value = showContexts ? head(child.context) : child.value
    return showHiddenThoughts ||
      // exclude meta thoughts when showHiddenThoughts is off
      (!isFunction(value) && !meta(pathToContext(unroot(thoughtsRanked)).concat(value)).hidden) ||
      // always include thoughts in cursor
      (cursor && equalThoughtRanked(cursor[thoughtsRanked.length], child))
  })

  const proposedPageSize = isRoot(thoughtsRanked)
    ? Infinity
    : PAGINATION_SIZE * page
  if (editIndex > proposedPageSize - 1) {
    setPage(page + 1)
    return null
  }
  const isPaginated = show && filteredChildren.length > proposedPageSize
  // expand root, editing path, and contexts previously marked for expansion in setCursor

  // get shared subcontext index between cursor and thoughtsResolved
  const subcontextIndex = checkIfPathShareSubcontext(cursor || [], thoughtsResolved)

  // check if thoughtResolved is ancestor, descendant of cursor or is equal to cursor itself
  const isAncestorOrDescendant = (subcontextIndex + 1) === (cursor || []).length
  || (subcontextIndex + 1) === thoughtsResolved.length

  /*
    Check if the chilren are distant relatives and their depth equals to or greater than cursor.
    With current implementation we don't cosider the condition where a node which is neither ancestor or descendant
    of cursor can have zero distance-from-cursor. So we check the condition here and dim the nodes.
  */
  const shouldDim = (distance === 0) && !isAncestorOrDescendant

  /*
    Unlike normal view where there is only one expanded thougt in a context, table view node has all its children expand and render their respective subthoughts.
    If we select any grandchildren of the main table view node, all it's children will disappear but the grandchildren will still show up.
    We check that condtion and hide the node.
  */
  const shouldHide = (distance === 1) && !isAncestorOrDescendant && thoughtsResolved.length > 0

  const actualDistance = shouldHide ? 2 : (shouldDim ? 1 : distance)

  return <React.Fragment>

    {contextBinding && showContexts ? <div className='text-note text-small'>(Bound to {pathToContext(contextBinding).join('/')})</div> : null}

    {show && showContexts && !(children.length === 0 && isRoot(thoughtsRanked))
      ? children.length < (allowSingleContext ? 1 : 2) ?

        // No children
        <NoChildren allowSingleContext={allowSingleContext} children={children} thoughtsRanked={thoughtsRanked} />

        // "Contexts:"
        : children.length > (showContexts && !allowSingleContext ? 1 : 0) ? <div className='children-subheading text-note text-small' style={{ top: '4px' }}>Context{children.length === 1 ? '' : 's'}:
        </div>

        : null

      : null}

    {children.length > (showContexts && !allowSingleContext ? 1 : 0) && show ? <ul
      // thoughtIndex-thoughts={showContexts ? hashContext(unroot(pathToContext(thoughtsRanked))) : null}
      className={classNames({
        children: true,
        'context-chain': showContexts,
        [`distance-from-cursor-${actualDistance}`]: true
      })}
    >
      {filteredChildren
        .map((child, i) => {
          if (i >= proposedPageSize) {
            return null
          }
          const childPath = getChildPath(child, thoughtsRanked, showContexts)

          /* simply using index i as key will result in very sophisticated rerendering when new Empty thoughts are added.
          The main problem is that when a new Thought is added it will get key (index) of the previous thought,
          causing React DOM to think it as old component that needs re-render and thus the new thoughyt won't be able to mount itself as a new component.

          By using child's rank we have unique key for every new thought.
          Using unique rank will help React DOM to properly identify old components and the new one. Thus eliminating sophisticated
          re-renders.
        */

          return child ? <Thought
            allowSingleContext={allowSingleContextParent}
            // grandchildren can be manually added in code view
            childrenForced={child.children}
            contextChain={showContexts ? contextChain.concat([thoughtsRanked]) : contextChain}
            count={count + sumSubthoughtsLength(children)}
            depth={depth + 1}
            key={child.rank}
            rank={child.rank}
            showContexts={showContexts}
            thoughtsRanked={childPath}
          /> : null
        })}
      {dropTarget(<li className={classNames({
        child: true,
        'drop-end': true,
        last: depth === 0
      })} style={{ display: globals.simulateDrag || isDragInProgress ? 'list-item' : 'none' }}>
        <span className='drop-hover' style={{ display: globals.simulateDropHover || isHovering ? 'inline' : 'none' }}></span>
      </li>)}
    </ul> : <EmptyChildrenDropTarget
      depth={depth}
      dropTarget={dropTarget}
      isDragInProgress={isDragInProgress}
      isHovering={isHovering}
    />}
    {isPaginated && distance !== 2 && <a className='indent text-note' onClick={() => setPage(page + 1)}>More...</a>}
  </React.Fragment>
}

/*
  @param focus  Needed for Editable to determine where to restore the selection after delete
  @param allowSingleContextParent  Pass through to Subthought since the SearchSubthoughts component does not have direct access. Default: false.
  @param allowSingleContext  Allow showing a single context in context view. Default: false.
*/
const Subthoughts = connect(mapStateToProps)((DropTarget('thought', { canDrop, drop }, dropCollect)(SubthoughtsComponent)))

export default Subthoughts
