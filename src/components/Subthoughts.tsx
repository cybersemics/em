import React, { useEffect, useState } from 'react'
import { connect } from 'react-redux'
import classNames from 'classnames'
import assert from 'assert'
import { ConnectDropTarget, DropTarget, DropTargetConnector, DropTargetMonitor } from 'react-dnd'
import { store } from '../store'
import { isTouch } from '../browser'
import { formatKeyboardShortcut, shortcutById } from '../shortcuts'
import globals from '../globals'
import { DROP_TARGET, MAX_DEPTH, MAX_DISTANCE_FROM_CURSOR } from '../constants'
import { alert, error, dragInProgress } from '../action-creators'
import Thought from './Thought'
import GestureDiagram from './GestureDiagram'
import { State } from '../util/initialState'
import { Child, GesturePath, Index, Path, SimplePath, ThoughtContext } from '../types'

// util
import {
  checkIfPathShareSubcontext,
  parentOf,
  ellipsize,
  equalArrays,
  equalPath,
  hashContext,
  head,
  headValue,
  isDivider,
  isEM,
  isFunction,
  parseJsonSafe,
  pathToContext,
  isDescendantPath,
  sumSubthoughtsLength,
  isRoot,
  unroot,
  isAbsolute,
} from '../util'

// selectors
import {
  attribute,
  attributeEquals,
  childrenFilterPredicate,
  getChildPath,
  appendChildPath,
  getContextsSortedAndRanked,
  getNextRank,
  getPrevRank,
  getSetting,
  getStyle,
  getAllChildren,
  getChildrenRanked,
  getAllChildrenSorted,
  isContextViewActive,
  rootedParentOf,
} from '../selectors'

/** The type of the exported Subthoughts. */
interface SubthoughtsProps {
  allowSingleContext?: boolean,
  allowSingleContextParent?: boolean,
  childrenForced?: Child[],
  count?: number,
  depth?: number,
  expandable?: boolean,
  isParentHovering?: boolean,
  showContexts?: boolean,
  sort?: string,
  simplePath: SimplePath,
  path?: Path,
}

// assert shortcuts at load time
const subthoughtShortcut = shortcutById('newSubthought')
const toggleContextViewShortcut = shortcutById('toggleContextView')
assert(subthoughtShortcut)
assert(toggleContextViewShortcut)

const PAGINATION_SIZE = 100

/********************************************************************
 * mapStateToProps
 ********************************************************************/

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State, props: SubthoughtsProps) => {

  const {
    cursor,
    dataNonce,
    showHiddenThoughts,
    rootContext
  } = state

  const isAbsoluteContext = isAbsolute(rootContext)

  const resolvedPath = props.path ?? props.simplePath

  // check if the cursor path includes the current thought
  // include ROOT to prevent re-render when ROOT subthought changes
  const isEditingPath = isRoot(props.simplePath) || isDescendantPath(cursor, resolvedPath)

  // check if the cursor is editing an thought directly
  const isEditing = equalPath(cursor, resolvedPath)

  const pathLive = isEditing ? cursor! : resolvedPath
  const thoughtsLive = pathToContext(pathLive)
  const showContexts = props.showContexts || isContextViewActive(state, thoughtsLive)
  const showContextsParent = isContextViewActive(state, parentOf(thoughtsLive))
  const simplePath = showContexts && showContextsParent
    ? parentOf(props.simplePath)
    : props.simplePath

  // use live thoughts if editing
  // if editing, replace the head with the live value from the cursor
  const simplePathLive = isEditing && !showContextsParent
    ? parentOf(props.simplePath).concat(head(cursor!)) as SimplePath
    : simplePath

  const contextBinding = parseJsonSafe(attribute(state, pathToContext(simplePathLive), '=bindContext') ?? '', undefined) as Path | undefined

  // If the cursor is a leaf, use cursorDepth of cursor.length - 1 so that the autofocus stays one level zoomed out.
  // This feels more intuitive and stable for moving the cursor in and out of leaves.
  // In this case, the grandparent must be given the cursor-parent className so it is not hidden (below)
  // TODO: Resolve cursor to a simplePath
  const isCursorLeaf = cursor && !getAllChildren(state, pathToContext(cursor))
    .some((child: Child) => !isFunction(child.value))
  const cursorDepth = cursor
    ? cursor.length - (isCursorLeaf ? 1 : 0)
    : 0
  const distance = cursor ? Math.max(0,
    Math.min(MAX_DISTANCE_FROM_CURSOR, cursorDepth - (props.depth ?? 0))
  ) : 0

  return {
    contextBinding,
    dataNonce,
    distance,
    isEditingAncestor: isEditingPath && !isEditing,
    showContexts,
    showHiddenThoughts,
    simplePath: simplePathLive,
    // re-render if children change
    __render: getAllChildren(state, pathToContext(simplePathLive)),
    isExpanded: store.getState().expanded[hashContext(pathToContext(resolvedPath))],
    isAbsoluteContext,
  }
}

/********************************************************************
 * Drag and Drop
 ********************************************************************/

/** Returns true if a thought can be dropped in this context. Dropping at end of list requires different logic since the default drop moves the dragged thought before the drop target. */
const canDrop = (props: SubthoughtsProps, monitor: DropTargetMonitor) => {

  const { simplePath: thoughtsFrom } = monitor.getItem() as { simplePath: SimplePath }
  const thoughtsTo = props.simplePath
  const cursor = store.getState().cursor
  const distance = cursor ? cursor.length - thoughtsTo.length : 0
  const isHidden = distance >= 2
  // there is no self thought to check since this is <Subthoughts>
  const isDescendant = isDescendantPath(thoughtsTo, thoughtsFrom)
  const divider = isDivider(headValue(thoughtsTo))

  // do not drop on descendants or thoughts hidden by autofocus
  return !isHidden && !isDescendant && !divider
}

// eslint-disable-next-line jsdoc/require-jsdoc
const drop = (props: SubthoughtsProps, monitor: DropTargetMonitor) => {

  const state = store.getState()

  // no bubbling
  if (monitor.didDrop() || !monitor.isOver({ shallow: true })) return

  const { simplePath: thoughtsFrom } = monitor.getItem() as { simplePath: SimplePath }
  const thoughtsTo = props.simplePath
  const contextTo = pathToContext(thoughtsTo)
  const dropPlacement = attribute(state, contextTo, '=drop') === 'top' ? 'top' : 'bottom'

  const newPath = unroot([...thoughtsTo, {
    ...head(thoughtsFrom),
    rank: dropPlacement === 'top'
      ? getPrevRank(state, contextTo)
      : getNextRank(state, contextTo)
  }])

  const isRootOrEM = isRoot(thoughtsFrom) || isEM(thoughtsFrom)
  const oldContext = rootedParentOf(state, pathToContext(thoughtsFrom))
  const newContext = rootedParentOf(state, pathToContext(newPath))
  const sameContext = equalArrays(oldContext, newContext)

  // cannot drop on itself
  if (equalPath(thoughtsFrom, newPath)) return

  // cannot move root or em context or target is divider
  if (isDivider(headValue(thoughtsTo)) || (isRootOrEM && !sameContext)) {
    store.dispatch(error({ value: `Cannot move the ${isEM(thoughtsFrom) ? 'em' : 'home'} context to another context.` }))
    return
  }

  store.dispatch(props.showContexts
    ? {
      type: 'newThoughtSubmit',
      value: headValue(thoughtsTo),
      context: pathToContext(thoughtsFrom),
      rank: getNextRank(state, pathToContext(thoughtsFrom))
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
        : '"' + ellipsize(headValue(thoughtsTo)) + '"'

      store.dispatch(alert(`${alertFrom} moved to ${alertTo}.`))
      clearTimeout(globals.errorTimer)
      globals.errorTimer = window.setTimeout(() => store.dispatch(alert(null)), 5000)
    }, 100)
  }
}

// eslint-disable-next-line jsdoc/require-jsdoc
const dropCollect = (connect: DropTargetConnector, monitor: DropTargetMonitor) => ({
  dropTarget: connect.dropTarget(),
  isDragInProgress: monitor.getItem() as boolean,
  isHovering: monitor.isOver({ shallow: true }) && monitor.canDrop()
})

/********************************************************************
 * Component
 ********************************************************************/

/** A message that says there are no children in this context. */
const NoChildren = ({ allowSingleContext, children, simplePath }: { allowSingleContext?: boolean, children: Child[], simplePath: SimplePath }) =>
  <div className='children-subheading text-note text-small'>

    This thought is not found in any {children.length === 0 ? '' : 'other'} contexts.<br /><br />

    <span>{isTouch
      ? <span className='gesture-container'>Swipe <GestureDiagram path={subthoughtShortcut.gesture as GesturePath} size={30} color='darkgray' /></span>
      : <span>Type {formatKeyboardShortcut(subthoughtShortcut.keyboard!)}</span>
    } to add "{headValue(simplePath)}" to a new context.
    </span>

    <br />{allowSingleContext
      ? 'A floating context... how interesting.'
      : <span>{isTouch
        ? <span className='gesture-container'>Swipe <GestureDiagram path={toggleContextViewShortcut.gesture as GesturePath} size={30} color='darkgray'/* mtach .children-subheading color */ /></span>
        : <span>Type {formatKeyboardShortcut(toggleContextViewShortcut.keyboard!)}</span>
      } to return to the normal view.</span>
    }
  </div>

/** A drop target when there are no children in a context. Otherwise no drop target would be rendered in an empty context. */
const EmptyChildrenDropTarget = ({ depth, dropTarget, isDragInProgress, isHovering, isThoughtDivider }: { depth?: number, dropTarget: ConnectDropTarget, isDragInProgress?: boolean, isHovering?: boolean, isThoughtDivider?: boolean }) =>
  <ul className='empty-children' style={{ display: globals.simulateDrag || isDragInProgress ? 'block' : 'none' }}>
    {dropTarget(
      <li className={classNames({
        child: true,
        'drop-end': true,
        'inside-divider': isThoughtDivider,
        last: depth === 0
      })}>
        <span className='drop-hover' style={{ display: globals.simulateDropHover || isHovering ? 'inline' : 'none' }}></span>
      </li>
    )}
  </ul>

EmptyChildrenDropTarget.displayName = 'EmptyChildrenDropTarget'

/**
 * The static Subthoughts component.
 *
 * @param allowSingleContext         Allow showing a single context in context view. Default: false.
 * @param allowSingleContextParent   Pass through to Subthought since the SearchSubthoughts component does not have direct access. Default: false.
 * @param childrenForced             Optional.
 * @param contextBinding             Optional.
 * @param contextChain = []          Optional. Default: [].
 * @param count                      Optional. Default: 0.
 * @param depth.                     Optional. Default: 0.
 * @param isDragInProgress           Optional.
 * @param isEditingAncestor          Optional.
 * @param isHovering                 Optional.
 * @param showContexts               Optional.
 * @param showHiddenThoughts         Optional.
 * @param sort                       Optional. Default: contextSort.
 * @param simplePath             Renders the children of the given simplePath.
 */
export const SubthoughtsComponent = ({
  allowSingleContext,
  allowSingleContextParent,
  childrenForced,
  contextBinding,
  path,
  count = 0,
  depth = 0,
  distance,
  dropTarget,
  isDragInProgress,
  isEditingAncestor,
  isHovering,
  isParentHovering,
  showContexts,
  sort: contextSort,
  simplePath,
  showHiddenThoughts,
  isExpanded,
  isAbsoluteContext
}: SubthoughtsProps & ReturnType<typeof dropCollect> & ReturnType<typeof mapStateToProps>) => {

  // <Subthoughts> render
  const state = store.getState()
  const [page, setPage] = useState(1)
  const globalSort = getSetting(state, ['Global Sort']) || 'None'
  const sortPreference = contextSort || globalSort
  const { cursor } = state

  const resolvedPath = path ?? simplePath

  const show = depth < MAX_DEPTH && (isEditingAncestor || isExpanded)

  useEffect(() => {
    if (isHovering) {
      store.dispatch(dragInProgress({
        value: true,
        draggingThought: state.draggingThought,
        hoveringThought: [...context],
        hoveringPath: path,
        hoverId: DROP_TARGET.EmptyDrop
      }))
    }
  }, [isHovering])

  // disable intrathought linking until add, edit, delete, and expansion can be implemented
  // const subthought = once(() => getSubthoughtUnderSelection(headValue(simplePath), 3))

  const children = childrenForced ? childrenForced // eslint-disable-line no-unneeded-ternary
    : showContexts ?
      getContextsSortedAndRanked(state, headValue(simplePath))
      : sortPreference === 'Alphabetical' ? getAllChildrenSorted(state, pathToContext(contextBinding || simplePath))
      : getChildrenRanked(state, pathToContext(contextBinding || simplePath)) as (Child | ThoughtContext)[]

  // check duplicate ranks for debugging
  // React prints a warning, but it does not show which thoughts are colliding
  if (globals.checkDuplicateRanks) {
    children.reduce((accum, child) => {
      const match = accum[child.rank]
      if (match) {
        console.warn('Duplicate child rank', match[0], child)
        console.warn('simplePath', simplePath)
      }
      return {
        ...accum,
        [child.rank]: [...match, child]
      }
    }, {} as Index<Child[] | ThoughtContext[]>)
  }

  // Ensure that editable newThought is visible.
  const editIndex = cursor && children && show ? children.findIndex(child => {
    return cursor[depth] && cursor[depth].rank === child.rank
  }) : 0

  const filteredChildren = children.filter(childrenFilterPredicate(state, resolvedPath, pathToContext(simplePath), !!childrenForced))

  const proposedPageSize = isRoot(simplePath)
    ? Infinity
    : PAGINATION_SIZE * page
  if (editIndex > proposedPageSize - 1) {
    setPage(page + 1)
    return null
  }
  const isPaginated = show && filteredChildren.length > proposedPageSize
  // expand root, editing path, and contexts previously marked for expansion in setCursor

  // get shared subcontext index between cursor and path
  const subcontextIndex = checkIfPathShareSubcontext(cursor || [], resolvedPath)

  // check if thoughtResolved is ancestor, descendant of cursor or is equal to cursor itself
  const isAncestorOrDescendant = (subcontextIndex + 1) === (cursor || []).length
  || (subcontextIndex + 1) === resolvedPath.length

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
  const shouldHide = (distance === 1) && !isAncestorOrDescendant && unroot(resolvedPath).length > 0

  /*
    When =focus/Zoom is set on the cursor or parent of the cursor, change the autofocus so that it hides the level above.
    1. Force actualDistance to 2 to hide thoughts.
    2. Set zoomCursor and zoomParent CSS classes to handle siblings.
  */
  const zoomCursor = cursor && (attribute(state, pathToContext(cursor), '=focus') === 'Zoom'
    || attribute(state, pathToContext(parentOf(cursor)).concat('=children'), '=focus') === 'Zoom')
  const zoomParent = cursor && (attribute(state, pathToContext(parentOf(cursor)), '=focus') === 'Zoom'
    || attribute(state, pathToContext(parentOf(parentOf(cursor))).concat('=children'), '=focus') === 'Zoom')
  const zoomParentEditing = () => cursor && cursor.length > 2 && zoomParent && equalPath(parentOf(parentOf(cursor)), resolvedPath) // eslint-disable-line jsdoc/require-jsdoc
  const zoom = isEditingAncestor && (zoomCursor || zoomParentEditing())

  const actualDistance =
    shouldHide || zoom ? 2
    : shouldDim ? 1
    : distance

  const context = pathToContext(simplePath)

  const contextChildren = context.concat('=children') // children of parent with =children
  const contextGrandchildren = parentOf(context).concat('=grandchildren') // context of grandparent with =grandchildren
  const styleChildren = getStyle(state, contextChildren)
  const styleGrandChildren = getStyle(state, contextGrandchildren)
  const hideBulletsChildren = attribute(state, contextChildren, '=bullet') === 'None'
  const hideBulletsGrandchildren = attribute(state, contextGrandchildren, '=bullet') === 'None'
  const cursorOnAlphabeticalSort = cursor && attributeEquals(state, context, '=sort', 'Alphabetical')

  return <React.Fragment>

    {contextBinding && showContexts ? <div className='text-note text-small'>(Bound to {pathToContext(contextBinding!).join('/')})</div> : null}
    {show && showContexts && !(children.length === 0 && isRoot(simplePath))
      ? children.length < (allowSingleContext ? 1 : 2) ?

        // No children
        <NoChildren allowSingleContext={allowSingleContext} children={children as Child[]} simplePath={simplePath} />

        : null

      : null}

    {children.length > (showContexts && !allowSingleContext ? 1 : 0) && show ? <ul
      // thoughtIndex-thoughts={showContexts ? hashContext(unroot(pathToContext(simplePath))) : null}
      className={classNames({
        children: true,
        'context-chain': showContexts,
        [`distance-from-cursor-${actualDistance}`]: true,
        zoomCursor,
        zoomParent,
      })}
    >
      {filteredChildren
        .map((child, i) => {

          if (i >= proposedPageSize) {
            return null
          }

          // TODO: childPath should be unrooted, but if we change it it breaks
          // figure out what is incorrectly depending on childPath being rooted
          const childPath = getChildPath(state, child, simplePath, showContexts)
          const childContext = pathToContext(childPath)

          /** Returns true if the cursor in in the child path. */
          const isEditingChildPath = () => isDescendantPath(state.cursor, childPath)
          const styleZoom = getStyle(state, [...childContext, '=focus', 'Zoom'])

          /** Returns true if the bullet should be hidden. */
          const hideBullet = () => attribute(state, childContext, '=bullet') === 'None'

          /** Returns true if the bullet should be hidden if zoomed. */
          const hideBulletZoom = () => isEditingChildPath() && attribute(state, [...childContext, '=focus', 'Zoom'], '=bullet') === 'None'

          /*
            simply using index i as key will result in very sophisticated rerendering when new Empty thoughts are added.
            The main problem is that when a new Thought is added it will get key (index) of the previous thought,
            causing React DOM to think it as old component that needs re-render and thus the new thoughyt won't be able to mount itself as a new component.

            By using child's rank we have unique key for every new thought.
            Using unique rank will help React DOM to properly identify old components and the new one. Thus eliminating sophisticated
            re-renders.
          */

          return child ? <Thought
            allowSingleContext={allowSingleContextParent}
            count={count + sumSubthoughtsLength(children)}
            depth={depth + 1}
            hideBullet={hideBulletsChildren || hideBulletsGrandchildren || hideBullet() || hideBulletZoom()}
            key={`${child.id || child.rank}${(child as ThoughtContext).context ? '-context' : ''}`}
            rank={child.rank}
            isDraggable={actualDistance < 2}
            showContexts={showContexts}
            prevChild={filteredChildren[i - 1]}
            isParentHovering={isParentHovering}
            style={{
              ...styleGrandChildren,
              ...styleChildren,
              ...isEditingChildPath() ? styleZoom : null,
            }}
            path={appendChildPath(state, childPath, path)}
            simplePath={childPath}
          /> : null
        })}
      {dropTarget(<li className={classNames({
        child: true,
        'drop-end': true,
        last: depth === 0
      })} style={{ display: globals.simulateDrag || isDragInProgress ? 'list-item' : 'none' }}>
        <span className='drop-hover' style={{ display: (globals.simulateDropHover || isHovering) && !cursorOnAlphabeticalSort ? 'inline' : 'none' }}></span>
      </li>)}
    </ul> : <EmptyChildrenDropTarget
      isThoughtDivider={isDivider(headValue(simplePath))}
      depth={depth}
      dropTarget={dropTarget}
      isDragInProgress={isDragInProgress}
      isHovering={isHovering}
    />}
    {isPaginated && distance !== 2 && <a className='indent text-note' onClick={() => setPage(page + 1)}>More...</a>}
  </React.Fragment>
}

SubthoughtsComponent.displayName = 'SubthoughtComponent'

const Subthoughts = connect(mapStateToProps)(DropTarget('thought', { canDrop, drop }, dropCollect)(SubthoughtsComponent))

export default Subthoughts
