import React, { useEffect, useState } from 'react'
import { connect, useStore } from 'react-redux'
import classNames from 'classnames'
import { ConnectDropTarget, DropTarget, DropTargetConnector, DropTargetMonitor } from 'react-dnd'
import { store } from '../store'
import { isTouch } from '../browser'
import { formatKeyboardShortcut, shortcutById } from '../shortcuts'
import globals from '../globals'
import { DROP_TARGET, MAX_DEPTH, MAX_DISTANCE_FROM_CURSOR } from '../constants'
import { alert, error, dragInProgress } from '../action-creators'
import Thought from './Thought'
import GestureDiagram from './GestureDiagram'
import { ThoughtId, Context, GesturePath, Index, LazyEnv, Path, SimplePath, State } from '../@types'

// util
import {
  appendToPath,
  checkIfPathShareSubcontext,
  contextToThoughtId,
  ellipsize,
  equalArrays,
  equalPath,
  hashPath,
  head,
  headValue,
  isAbsolute,
  isDescendant,
  isDescendantPath,
  isDivider,
  isEM,
  isFunction,
  isRoot,
  once,
  parentOf,
  parseJsonSafe,
  parseLet,
  pathToContext,
  unroot,
} from '../util'

// selectors
import {
  appendChildPath,
  attribute,
  attributeEquals,
  childIdsToThoughts,
  childrenFilterPredicate,
  contextToPath,
  findDescendant,
  getAllChildren,
  getAllChildrenSorted,
  getChildPath,
  getChildren,
  getChildrenRankedById,
  getContextsSortedAndRanked,
  getEditingPath,
  getNextRank,
  getSortPreference,
  getStyle,
  getThoughtById,
  isContextViewActive,
  rootedParentOf,
} from '../selectors'
import { getAllChildrenAsThoughtsById } from '../selectors/getChildren'

/** The type of the exported Subthoughts. */
interface SubthoughtsProps {
  allowSingleContext?: boolean
  allowSingleContextParent?: boolean
  childrenForced?: ThoughtId[]
  depth?: number
  env?: Index<Context>
  expandable?: boolean
  isHeader?: boolean
  isParentHovering?: boolean
  showContexts?: boolean
  simplePath: SimplePath
  path?: Path
}

// assert shortcuts at load time
const subthoughtShortcut = shortcutById('newSubthought')
// const toggleContextViewShortcut = shortcutById('toggleContextView')
if (!subthoughtShortcut) throw new Error('newSubthought shortcut not found.')
// @MIGRATION_NOTE: toogle view is disabled for the migration
// if (!toggleContextViewShortcut) throw new Error('toggleContextView shortcut not found.')

const PAGINATION_SIZE = 100
const EMPTY_OBJECT = {}

/** Check if the given path is a leaf. */
const isLeaf = (state: State, context: Context) => getChildren(state, context).length === 0

/** Finds the the first env context with =focus/Zoom. */
const findFirstEnvContextWithZoom = (state: State, { id, env }: { id: ThoughtId; env: LazyEnv }): Context | null => {
  const children = getAllChildrenAsThoughtsById(state, id)
  const child = children.find(child => {
    /** Returns true if the env context has zoom. */
    const hasZoom = () => {
      const envChildPath = contextToPath(state, env[child.value])
      return envChildPath && attribute(state, head(envChildPath), '=focus') === 'Zoom'
    }
    return isFunction(child.value) && child.value in env && hasZoom()
  })
  return child ? [...env[child.value], '=focus', 'Zoom'] : null
}

/********************************************************************
 * mapStateToProps
 ********************************************************************/

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State, props: SubthoughtsProps) => {
  const { cursor, showHiddenThoughts, rootContext, expandedBottom, expandHoverTopPath } = state

  const isAbsoluteContext = isAbsolute(rootContext)

  const resolvedPath = props.path ?? props.simplePath

  // check if the cursor path includes the current thought
  // include ROOT to prevent re-render when ROOT subthought changes
  const isEditingPath = isRoot(props.simplePath) || isDescendantPath(cursor, resolvedPath)

  // check if the cursor is editing an thought directly
  const isEditing = equalPath(cursor, resolvedPath)

  const pathLive = isEditing ? cursor! : resolvedPath

  // @MIGRATION_TODO: Access the context through nestered iteration instead of generating everytime here.
  const thoughtsLive = pathToContext(state, pathLive)
  const showContexts = props.showContexts || isContextViewActive(state, thoughtsLive)
  const showContextsParent = isContextViewActive(state, parentOf(thoughtsLive))

  const simplePath = showContexts && showContextsParent ? parentOf(props.simplePath) : props.simplePath

  // use live thoughts if editing
  // if editing, replace the head with the live value from the cursor
  const simplePathLive = isEditing && !showContextsParent ? getEditingPath(state, props.simplePath) : simplePath
  const contextLive = pathToContext(state, simplePathLive)
  const cursorContext = cursor ? pathToContext(state, cursor) : null

  const contextBinding = parseJsonSafe(attribute(state, head(simplePathLive), '=bindContext') ?? '', undefined) as
    | Path
    | undefined

  // If the cursor is a leaf, use cursorDepth of cursor.length - 1 so that the autofocus stays one level zoomed out.
  // This feels more intuitive and stable for moving the cursor in and out of leaves.
  // In this case, the grandparent must be given the cursor-parent className so it is not hidden (below)
  // TODO: Resolve cursor to a simplePath
  const isCursorLeaf = cursorContext && isLeaf(state, cursorContext)

  const cursorDepth = cursor ? cursor.length - (isCursorLeaf ? 1 : 0) : 0

  const expandTopDistance = expandHoverTopPath && expandHoverTopPath?.length + 1

  // Note: If there is an active expand top path then distance should be caculated with reference of expandTopDistance
  const referenceDepth = expandTopDistance || cursorDepth

  const distance = referenceDepth
    ? Math.max(0, Math.min(MAX_DISTANCE_FROM_CURSOR, referenceDepth - (props.depth ?? 0)))
    : 0

  // TODO: Memoize childrenFiltered and pass to render instead of using dummy values to force a re-render
  const allChildren = getAllChildren(state, contextLive)

  // encode the children's values and ranks, since the allChildren array will not change when ranks change (i.e. moveThoughtUp/Down)
  // this can be removed once childrenFiltered is memoized and passed to render
  const allChildrenValuesAndRanks = allChildren
    .map(childId => {
      const child = getThoughtById(state, childId)
      return `${child?.value}-${child?.rank}`
    })
    .join('__SEP__')

  const firstChilId = allChildren[0]

  const hasChildrenLoaded = firstChilId && getThoughtById(state, firstChilId)

  const cursorSubthoughtIndex = cursor ? checkIfPathShareSubcontext(cursor, resolvedPath) : -1

  const isAncestorOfCursor =
    cursor && resolvedPath.length === cursorSubthoughtIndex + 1 && cursor?.length > resolvedPath.length

  const maxDistance = MAX_DISTANCE_FROM_CURSOR - (isCursorLeaf ? 1 : 2)
  /** First visible thought at the top. */
  const firstVisiblePath = cursor?.slice(0, -maxDistance) as Path

  const isDescendantOfCursor =
    cursor && cursor.length === cursorSubthoughtIndex + 1 && resolvedPath.length > cursor?.length

  const isCursor = cursor && resolvedPath.length === cursorSubthoughtIndex + 1 && resolvedPath.length === cursor?.length
  const isCursorParent = cursor && isAncestorOfCursor && cursor.length - resolvedPath.length === 1

  const isDescendantOfFirstVisiblePath = isDescendant(
    // TODO: Add support for [ROOT] to isDescendant
    pathToContext(state, firstVisiblePath || ([] as unknown as Path)),
    pathToContext(state, resolvedPath),
  )
  /*
    The thoughts that are not the ancestor of cursor or the descendants of first visible thought should be shifted left and hidden.
  */
  const shouldShiftAndHide = !isAncestorOfCursor && !isDescendantOfFirstVisiblePath

  /*
    Note:

    # Thoughts that should not be dimmed
      - Cursor and its descendants.
      - Thoughts that are both descendant of the first visible thought and ancestor of the cursor.
      - Siblings of the cursor if the cursor is a leaf thought.

    # Thoughts that should be dimmed
      - first visible thought should be dimmed if it is not direct parent of the cursor.
      - Besides the above mentioned thoughts in the above "should not dim section", all the other thoughts that are descendants of the first visible thought should be dimmed.
  */
  const shouldDim =
    cursor && isDescendantOfFirstVisiblePath && !(isCursorParent && isCursorLeaf) && !isCursor && !isDescendantOfCursor

  /*
    Note: `shouldShiftAndHide` and `shouldDim` needs to be calculated here because distance-from-cursor implementation takes only depth into account. But some thoughts needs to be shifted, hidden or dimmed due to their position relative to the cursor.
  */

  /** Returns true if editing a grandchild of the cursor whose parent is zoomed. */
  const zoomParentEditing = () =>
    // eslint-disable-next-line jsdoc/require-jsdoc
    cursor && cursor.length > 2 && zoomParent && equalPath(parentOf(parentOf(cursor)), resolvedPath)

  // merge ancestor env into self env
  // only update the env object reference if there are new additions to the environment
  // otherwise props changes and causes unnecessary re-renders
  const envSelf = parseLet(state, pathToContext(state, simplePath))
  const env = Object.keys(envSelf).length > 0 ? { ...props.env, ...envSelf } : props.env || EMPTY_OBJECT
  const parentChildrenAttributeId = cursor && findDescendant(state, head(rootedParentOf(state, cursor)), '=children')
  const grandparentChildrenAttributeId =
    cursor && findDescendant(state, head(rootedParentOf(state, parentOf(cursor))), '=children')
  /*
    When =focus/Zoom is set on the cursor or parent of the cursor, change the autofocus so that it hides the level above.
    1. Force actualDistance to 2 to hide thoughts.
    2. Set zoomCursor and zoomParent CSS classes to handle siblings.
  */
  const zoomCursor =
    cursor &&
    (attributeEquals(state, head(cursor), '=focus', 'Zoom') ||
      attributeEquals(state, parentChildrenAttributeId, '=focus', 'Zoom') ||
      findFirstEnvContextWithZoom(state, { id: head(cursor), env }))

  const zoomParent =
    cursor &&
    (attributeEquals(state, head(rootedParentOf(state, cursor)), '=focus', 'Zoom') ||
      attributeEquals(state, grandparentChildrenAttributeId, '=focus', 'Zoom') ||
      findFirstEnvContextWithZoom(state, { id: head(rootedParentOf(state, cursor)), env }))

  const isEditingAncestor = isEditingPath && !isEditing

  const zoom = isEditingAncestor && (zoomCursor || zoomParentEditing())

  /*
    Note: The following properties is applied to the immediate childrens with given class.

    distance-from-cursor-0 fully visible
    distance-from-cursor-1 dimmed
    distance-from-cursor-2 shifted left and hidden
    distance-from-cursor-3 shiifted left and hidden

    Note: This doesn't fully account for the visibility. There are other additional classes that can affect opacity. For example cursor and its expanded descendants are always visible with full opacity.
  */
  const actualDistance = shouldShiftAndHide || zoom ? 2 : shouldDim ? 1 : distance

  const sortPreference = getSortPreference(state, head(simplePathLive))

  const hashedPath = hashPath(pathLive)

  /** Returns true if the thought is in table view and has more than two columns. This is the case when every row has at least two matching children in column 2. If this is the case, it will get rendered in multi column mode where grandchildren are used as header columns. */
  const isMultiColumnTable = () => {
    const view = attribute(state, head(simplePathLive), '=view')
    if (view !== 'Table') return false
    const childrenFiltered = allChildren
      .map(childId => getThoughtById(state, childId))
      .filter(child => child && !isFunction(child.value))

    if (childrenFiltered.length === 0) return false

    const firstColumnChildren = getAllChildren(state, [...contextLive, childrenFiltered[0].value])
      .map(childId => getThoughtById(state, childId))
      .filter(child => child && !isFunction(child.value))

    // create a map of column headers from the first row for O(1) lookup when checking other rows
    const columnMap = firstColumnChildren.reduce((accum, child) => ({ ...accum, [child.value]: true }), {})

    const otherChildren = childrenFiltered.slice(1).map(child => {
      const childContext = [...contextLive, child.value]
      const grandchildren = getAllChildren(state, childContext)
        .map(childId => getThoughtById(state, childId))
        .filter(child => child && !isFunction(child.value))
      return grandchildren
    })

    const isMultiColumn =
      otherChildren.length > 0 &&
      otherChildren.every(children => children.filter(child => child.value in columnMap).length >= 2)

    return isMultiColumn
  }

  return {
    contextBinding,
    distance,
    actualDistance,
    env,
    isAbsoluteContext,
    isEditingAncestor,
    // expand thought due to cursor and hover expansion
    isExpanded: !!state.expanded[hashedPath] || !!expandedBottom?.[hashedPath],
    isMultiColumnTable: isMultiColumnTable(),
    showContexts,
    showHiddenThoughts,
    simplePath: simplePathLive,
    // pass sortType and sortDirection since they are scalars
    // passing sortPreference directly would re-render the component each time, since the preference object reference changes
    sortType: sortPreference.type,
    sortDirection: sortPreference.direction,
    zoomCursor,
    zoomParent,
    // Re-render if children change and when children Thought entry in thoughtIndex is available.
    // Uses getAllChildren for efficient change detection. Probably does not work in context view.
    // Not used by render function, which uses a more complex calculation of children that supports context view.
    __allChildren: hasChildrenLoaded ? allChildren : null,
    __allChildrenValuesAndRanks: hasChildrenLoaded ? allChildrenValuesAndRanks : null,
    // We need to re-render when actualDistance changes, but it is complicated and expensive.
    // Until actualDistance gets refactored and optimized, we can provide a quick fix for any observed rendering issues.
    // The only rendering issue observed so far is when the cursor changes from a leaf thought in the home context (actualDistance: 1) to null (actualDistance: 0).
    // This is especially fragile since other code may accidentally rely on this to re-render the component.
    // If optimizing or testing re-rendering, it would be best to remove this line.
    __noCursorRoot: isRoot(simplePath) && state.cursor === null,
  }
}

/********************************************************************
 * Drag and Drop
 ********************************************************************/

/** Returns true if a thought can be dropped in this context. Dropping at end of list requires different logic since the default drop moves the dragged thought before the drop target. */
const canDrop = (props: SubthoughtsProps, monitor: DropTargetMonitor) => {
  const { simplePath: thoughtsFrom } = monitor.getItem() as { simplePath: SimplePath }
  const thoughtsTo = props.simplePath
  const { cursor, expandHoverTopPath, thoughts } = store.getState()

  const { path } = props

  /** If the epxand hover top is active then all the descenendants of the current active expand hover top path should be droppable. */
  const isExpandedTop = () =>
    path && expandHoverTopPath && path.length >= expandHoverTopPath.length && isDescendantPath(path, expandHoverTopPath)

  const distance = cursor ? cursor.length - thoughtsTo.length : 0
  const isHidden = distance >= 2 && !isExpandedTop()

  // there is no self thought to check since this is <Subthoughts>
  const isDescendant = isDescendantPath(thoughtsTo, thoughtsFrom)

  const toThought = thoughts.thoughtIndex[head(thoughtsTo)]
  const divider = isDivider(toThought.value)

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

  const newPath = appendToPath(thoughtsTo, head(thoughtsFrom))

  const isRootOrEM = isRoot(thoughtsFrom) || isEM(thoughtsFrom)
  const oldContext = rootedParentOf(state, pathToContext(state, thoughtsFrom))
  const newContext = rootedParentOf(state, pathToContext(state, newPath))
  const sameContext = equalArrays(oldContext, newContext)

  const toThought = getThoughtById(state, head(thoughtsTo))
  const fromThought = getThoughtById(state, head(thoughtsFrom))

  // cannot drop on itself
  if (equalPath(thoughtsFrom, thoughtsTo)) return

  // cannot move root or em context or target is divider
  if (isDivider(toThought.value) || (isRootOrEM && !sameContext)) {
    store.dispatch(
      error({ value: `Cannot move the ${isEM(thoughtsFrom) ? 'em' : 'home'} context to another context.` }),
    )
    return
  }

  store.dispatch(
    props.showContexts
      ? {
          type: 'createThought',
          value: toThought.value,
          context: pathToContext(state, thoughtsFrom),
          rank: getNextRank(state, head(thoughtsFrom)),
        }
      : {
          type: 'moveThought',
          oldPath: thoughtsFrom,
          newPath,
          newRank: getNextRank(state, head(thoughtsTo)),
        },
  )

  // alert user of move to another context
  if (!sameContext) {
    // wait until after MultiGesture has cleared the error so this alert does no get cleared
    setTimeout(() => {
      const alertFrom = '"' + ellipsize(fromThought.value) + '"'
      const alertTo = isRoot(newContext) ? 'home' : '"' + ellipsize(toThought.value) + '"'

      store.dispatch(alert(`${alertFrom} moved to ${alertTo}.`, { alertType: 'moveThought', clearDelay: 5000 }))
    }, 100)
  }
}

// eslint-disable-next-line jsdoc/require-jsdoc
const dropCollect = (connect: DropTargetConnector, monitor: DropTargetMonitor) => ({
  dropTarget: connect.dropTarget(),
  isDragInProgress: monitor.getItem() as boolean,
  isHovering: monitor.isOver({ shallow: true }) && monitor.canDrop(),
})

/********************************************************************
 * Component
 ********************************************************************/

/** A message that says there are no children in this context. */
const NoChildren = ({
  allowSingleContext,
  children,
  simplePath,
}: {
  allowSingleContext?: boolean
  children: ThoughtId[]
  simplePath: SimplePath
}) => {
  const store = useStore<State>()

  const { value } = getThoughtById(store.getState(), head(simplePath))

  return (
    <div className='children-subheading text-note text-small'>
      This thought is not found in any {children.length === 0 ? '' : 'other'} contexts.
      <br />
      <br />
      <span>
        {isTouch ? (
          <span className='gesture-container'>
            Swipe <GestureDiagram path={subthoughtShortcut.gesture as GesturePath} size={30} color='darkgray' />
          </span>
        ) : (
          <span>Type {formatKeyboardShortcut(subthoughtShortcut.keyboard!)}</span>
        )}{' '}
        to add "{value}" to a new context.
      </span>
      <br />
      {allowSingleContext ? (
        'A floating context... how interesting.'
      ) : (
        // @MIGRATION_NOTE: toogle view is disabled for the migration
        // <span>
        //   {isTouch ? (
        //     <span className='gesture-container'>
        //       Swipe{' '}
        //       <GestureDiagram
        //         path={toggleContextViewShortcut.gesture as GesturePath}
        //         size={30}
        //         color='darkgray' /* mtach .children-subheading color */
        //       />
        //     </span>
        //   ) : (
        //     <span>Type {formatKeyboardShortcut(toggleContextViewShortcut.keyboard!)}</span>
        //   )}{' '}
        //   to return to the normal view.
        // </span>
        <></>
      )}
    </div>
  )
}

/** A drop target when there are no children in a context. Otherwise no drop target would be rendered in an empty context. */
const EmptyChildrenDropTarget = ({
  depth,
  dropTarget,
  isDragInProgress,
  isHovering,
  isThoughtDivider,
}: {
  depth?: number
  dropTarget: ConnectDropTarget
  isDragInProgress?: boolean
  isHovering?: boolean
  isThoughtDivider?: boolean
}) => (
  <ul className='empty-children' style={{ display: globals.simulateDrag || isDragInProgress ? 'block' : 'none' }}>
    {dropTarget(
      <li
        className={classNames({
          child: true,
          'drop-end': true,
          'inside-divider': isThoughtDivider,
          last: depth === 0,
        })}
      >
        <span
          className='drop-hover'
          style={{ display: globals.simulateDropHover || isHovering ? 'inline' : 'none' }}
        ></span>
      </li>,
    )}
  </ul>
)

EmptyChildrenDropTarget.displayName = 'EmptyChildrenDropTarget'

/**
 * The static Subthoughts component.
 *
 * @param allowSingleContext         Allow showing a single context in context view. Default: false.
 * @param allowSingleContextParent   Pass through to Subthought since the SearchSubthoughts component does not have direct access. Default: false.
 * @param childrenForced             Optional.
 * @param contextBinding             Optional.
 * @param contextChain = []          Optional. Default: [].
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
  depth = 0,
  distance,
  dropTarget,
  env,
  isDragInProgress,
  isEditingAncestor,
  isExpanded,
  isHeader,
  isHovering,
  isMultiColumnTable,
  isParentHovering,
  path,
  showContexts,
  simplePath,
  sortDirection: contextSortDirection,
  sortType: contextSortType,
  zoomCursor,
  zoomParent,
}: SubthoughtsProps & ReturnType<typeof dropCollect> & ReturnType<typeof mapStateToProps>) => {
  // <Subthoughts> render
  const state = store.getState()
  const [page, setPage] = useState(1)
  const { cursor } = state
  const thoughtId = head(simplePath)
  const context = pathToContext(state, simplePath)
  const thought = getThoughtById(state, head(simplePath))
  const { value } = thought
  const resolvedPath = path ?? simplePath

  const show = depth < MAX_DEPTH && (isEditingAncestor || isExpanded)

  useEffect(() => {
    if (isHovering) {
      store.dispatch(
        dragInProgress({
          value: true,
          draggingThought: state.draggingThought,
          hoveringPath: path,
          hoverId: DROP_TARGET.EmptyDrop,
        }),
      )
    }
  }, [isHovering])

  // disable intrathought linking until add, edit, delete, and expansion can be implemented
  // const subthought = once(() => getSubthoughtUnderSelection(headValue(simplePath), 3))
  const children =
    childrenForced || showContexts
      ? getContextsSortedAndRanked(state, headValue(state, simplePath))
      : contextSortType !== 'None'
      ? getAllChildrenSorted(state, thoughtId)
      : /*
          @MIGRATION_TODO: Thought should be accessed using path or id instead of context.
          Due to pending merge mechanism, sometimes a context can have duplicates for a brief moment. So access by context can be problematic.
          Migrate all possible context based selectors to use path or thought ids.
        */
        getChildrenRankedById(state, head(simplePath))

  const cursorThoughtArray = cursor && childIdsToThoughts(state, cursor)
  // Ensure that editable newThought is visible.
  const editIndex =
    cursor && children && show && cursorThoughtArray
      ? children.findIndex(child => {
          return cursor[depth] && cursorThoughtArray[depth].rank === child.rank
        })
      : 0

  const filteredChildren = children.filter(childrenFilterPredicate(state, simplePath))

  const proposedPageSize = PAGINATION_SIZE * page
  if (editIndex > proposedPageSize - 1) {
    setPage(page + 1)
    return null
  }
  const isPaginated = show && filteredChildren.length > proposedPageSize
  /** Returns true if editing a grandchild of the cursor whose parent is zoomed. */
  const zoomParentEditing = () =>
    // eslint-disable-next-line jsdoc/require-jsdoc
    cursor && cursor.length > 2 && zoomParent && equalPath(parentOf(parentOf(cursor)), resolvedPath)

  const zoom = isEditingAncestor && (zoomCursor || zoomParentEditing())

  /** Calculates the autofocus state to hide or dim thoughts.
   * Note: The following properties is applied to the immediate childrens with given class.
   * - distance-from-cursor-0 fully visible
   * - distance-from-cursor-1 dimmed
   * - distance-from-cursor-2 shifted left and hidden
   * - distance-from-cursor-3 shiifted left and hidden
   * Note: This doesn't fully account for the visibility. There are other additional classes that can affect opacity. For example cursor and its expanded descendants are always visible with full opacity.
   */
  const actualDistance = once(() => {
    /*
    Note:

    # Thoughts that should not be dimmed
      - Cursor and its descendants.
      - Thoughts that are both descendant of the first visible thought and ancestor of the cursor.
      - Siblings of the cursor if the cursor is a leaf thought.

    # Thoughts that should be dimmed
      - first visible thought should be dimmed if it is not direct parent of the cursor.
      - Besides the above mentioned thoughts in the above "should not dim section", all the other thoughts that are descendants of the first visible thought should be dimmed.

    Note: `shouldShiftAndHide` and `shouldDim` needs to be calculated here because distance-from-cursor implementation takes only depth into account. But some thoughts needs to be shifted, hidden or dimmed due to their position relative to the cursor.
    */

    const isCursorLeaf = cursor && isLeaf(state, pathToContext(state, cursor))

    const maxDistance = MAX_DISTANCE_FROM_CURSOR - (isCursorLeaf ? 1 : 2)

    /** First visible thought at the top. */
    const firstVisiblePath = cursor?.slice(0, -maxDistance) as Path | undefined

    const isDescendantOfFirstVisiblePath = isDescendant(
      // TODO: Add support for [ROOT] to isDescendant
      pathToContext(state, firstVisiblePath || ([] as unknown as Path)),
      pathToContext(state, resolvedPath),
    )

    const cursorSubthoughtIndex = once(() => (cursor ? checkIfPathShareSubcontext(cursor, resolvedPath) : -1))

    const isAncestorOfCursor =
      cursor && cursor.length > resolvedPath.length && resolvedPath.length === cursorSubthoughtIndex() + 1

    const isCursor =
      cursor && resolvedPath.length === cursorSubthoughtIndex() + 1 && resolvedPath.length === cursor?.length

    /** Returns true if the resolvedPath is a descendant of the cursor. */
    const isDescendantOfCursor = () =>
      cursor && resolvedPath.length > cursor.length && cursor.length === cursorSubthoughtIndex() + 1

    // thoughts that are not the ancestor of cursor or the descendants of first visible thought should be shifted left and hidden.
    const shouldShiftAndHide = !isAncestorOfCursor && !isDescendantOfFirstVisiblePath

    const isCursorParent = cursor && isAncestorOfCursor && cursor.length - resolvedPath.length === 1

    /** Returns true if the children should be dimmed by the autofocus. */
    const shouldDim = () => {
      return (
        cursor &&
        isDescendantOfFirstVisiblePath &&
        !(isCursorParent && isCursorLeaf) &&
        !isCursor &&
        !isDescendantOfCursor()
      )
    }

    return shouldShiftAndHide || zoom ? 2 : shouldDim() ? 1 : distance
  })

  const childrenAttributeId = findDescendant(state, thoughtId, '=children')
  const grandchildrenAttributeId = findDescendant(state, thoughtId, ['=grandchildren'])
  const styleChildren = getStyle(state, childrenAttributeId)
  const styleGrandChildren = getStyle(state, grandchildrenAttributeId)

  const hideBulletsChildren = childrenAttributeId && attribute(state, childrenAttributeId, '=bullet') === 'None'
  const hideBulletsGrandchildren =
    grandchildrenAttributeId && attribute(state, grandchildrenAttributeId, '=bullet') === 'None'
  const cursorOnAlphabeticalSort = cursor && getSortPreference(state, thoughtId).type === 'Alphabetical'

  /** In a Multi Column table, gets the children that serve as the column headers. */
  const headerChildrenWithFirstColumn = () => {
    if (!isMultiColumnTable) return []
    const headerChildren = getAllChildren(state, [...unroot(context), filteredChildren[0]?.value])
      .map(childId => getThoughtById(state, childId))
      .filter(x => x && !isFunction(x.value))
    return isMultiColumnTable ? ([{ headerFirstColumn: true }, ...headerChildren] as typeof headerChildren) : []
  }

  return (
    <>
      {contextBinding && showContexts ? (
        <div className='text-note text-small'>(Bound to {pathToContext(state, contextBinding!).join('/')})</div>
      ) : null}
      {show && showContexts && !(filteredChildren.length === 0 && isRoot(simplePath)) ? (
        filteredChildren.length < (allowSingleContext ? 1 : 2) ? (
          // No children
          <NoChildren
            allowSingleContext={allowSingleContext}
            children={children.map(({ id }) => id)}
            simplePath={simplePath}
          />
        ) : null
      ) : null}

      {show && filteredChildren.length > (showContexts && !allowSingleContext ? 1 : 0) ? (
        <ul
          // lexemeIndex-thoughts={showContexts ? hashContext(unroot(pathToContext(simplePath))) : null}
          className={classNames({
            children: true,
            'context-chain': showContexts,
            [`distance-from-cursor-${actualDistance()}`]: true,
            zoomCursor,
            zoomParent,
          })}
        >
          {
            /* TODO: Consolidate with filteredChildren items */
            isMultiColumnTable && (
              <li className='child is-multi-column'>
                {headerChildrenWithFirstColumn().map((child, i) => {
                  if ((child as any).headerFirstColumn) {
                    return <ul key=''></ul>
                  }

                  if (i >= proposedPageSize) {
                    return null
                  }

                  // TODO: childPath should be unrooted, but if we change it it breaks
                  // figure out what is incorrectly depending on childPath being rooted
                  const childPath = getChildPath(state, child.id, simplePath, showContexts)
                  const childEnvZoomId = once(() => {
                    const context = findFirstEnvContextWithZoom(state, { id: child.id, env })
                    return context && contextToThoughtId(state, context)
                  })

                  /** Returns true if the cursor is contained within the child path, i.e. the child is a descendant of the cursor. */
                  const isEditingChildPath = once(() => isDescendantPath(state.cursor, childPath))

                  /** Gets the =focus/Zoom/=style of the child path. */
                  const styleZoom = () => {
                    const zoomId = findDescendant(state, child.id, ['=focus', 'Zoom'])
                    return getStyle(state, zoomId)
                  }

                  /** Gets the style of the Zoom applied via env. */
                  const styleEnvZoom = () => (childEnvZoomId() ? getStyle(state, childEnvZoomId()!) : null)

                  const style = {
                    ...styleGrandChildren,
                    ...styleChildren,
                    ...(isEditingChildPath()
                      ? {
                          ...styleZoom(),
                          ...styleEnvZoom(),
                        }
                      : null),
                  }

                  const appendedChildPath = appendChildPath(state, childPath, path)
                  const isChildCursor = cursor && equalPath(appendedChildPath, state.cursor)
                  /*
            simply using index i as key will result in very sophisticated rerendering when new Empty thoughts are added.
            The main problem is that when a new Thought is added it will get key (index) of the previous thought,
            causing React DOM to think it as old component that needs re-render and thus the new thoughyt won't be able to mount itself as a new component.

            By using child's rank we have unique key for every new thought.
            Using unique rank will help React DOM to properly identify old components and the new one. Thus eliminating sophisticated
            re-renders.
          */
                  return child ? (
                    <ul className='children'>
                      <Thought
                        allowSingleContext={allowSingleContextParent}
                        depth={depth + 1}
                        env={env}
                        hideBullet={true}
                        rank={child.rank}
                        isVisible={
                          // if thought is a zoomed cursor then it is visible
                          (isChildCursor && !!zoomCursor) ||
                          actualDistance() < 2 ||
                          (distance === 2 && isEditingChildPath())
                        }
                        showContexts={showContexts}
                        prevChild={filteredChildren[i - 1]}
                        isParentHovering={isParentHovering}
                        style={{
                          // disable pointer interaction until we can handle column header editing
                          // otherwise it edits them only for the first row (and seems to create a circular context for some reason)
                          cursor: 'default',
                          fontWeight: 'bold',
                          pointerEvents: 'none',
                          ...style,
                        }}
                        path={appendedChildPath}
                        simplePath={childPath}
                        isMultiColumnTable={isMultiColumnTable}
                        isHeader={isHeader}
                      />
                    </ul>
                  ) : null
                })}
              </li>
            )
          }
          {filteredChildren.map((child, i) => {
            if (i >= proposedPageSize) {
              return null
            }

            // TODO: childPath should be unrooted, but if we change it it breaks
            // figure out what is incorrectly depending on childPath being rooted
            const childPath = getChildPath(state, child.id, simplePath, showContexts)
            const childEnvZoomId = once(() => {
              const context = findFirstEnvContextWithZoom(state, { id: child.id, env })
              return context && contextToThoughtId(state, context)
            })

            /** Returns true if the cursor is contained within the child path, i.e. the child is a descendant of the cursor. */
            const isEditingChildPath = once(() => isDescendantPath(state.cursor, childPath))

            /** Gets the =focus/Zoom/=style of the child path. */
            const styleZoom = () => {
              const zoomId = findDescendant(state, head(childPath), ['=focus', 'Zoom'])
              return getStyle(state, zoomId)
            }

            /** Gets the style of the Zoom applied via env. */
            const styleEnvZoom = () => {
              return childEnvZoomId() ? getStyle(state, childEnvZoomId()) : null
            }

            const style = {
              ...styleGrandChildren,
              ...styleChildren,
              ...(isEditingChildPath()
                ? {
                    ...styleZoom(),
                    ...styleEnvZoom(),
                  }
                : null),
            }

            /** Returns true if the bullet should be hidden. */
            const hideBullet = () => attribute(state, head(childPath), '=bullet') === 'None'

            /** Returns true if the bullet should be hidden if zoomed. */
            const hideBulletZoom = (): boolean => {
              if (!isEditingChildPath()) return false
              const zoomId = findDescendant(state, head(childPath), ['=focus', 'Zoom'])
              return (
                (zoomId && attribute(state, zoomId, '=bullet') === 'None') ||
                (!!childEnvZoomId() && attribute(state, childEnvZoomId()!, '=bullet') === 'None')
              )
            }

            const appendedChildPath = appendChildPath(state, childPath, path)
            const isChildCursor = cursor && equalPath(appendedChildPath, state.cursor)
            /*
            simply using index i as key will result in very sophisticated rerendering when new Empty thoughts are added.
            The main problem is that when a new Thought is added it will get key (index) of the previous thought,
            causing React DOM to think it as old component that needs re-render and thus the new thoughyt won't be able to mount itself as a new component.

            By using child's rank we have unique key for every new thought.
            Using unique rank will help React DOM to properly identify old components and the new one. Thus eliminating sophisticated
            re-renders.
          */
            return child ? (
              <Thought
                allowSingleContext={allowSingleContextParent}
                depth={depth + 1}
                env={env}
                hideBullet={hideBulletsChildren || hideBulletsGrandchildren || hideBullet() || hideBulletZoom()}
                key={`${child.id}-${child.rank}`}
                rank={child.rank}
                isVisible={
                  // if thought is a zoomed cursor then it is visible
                  (isChildCursor && !!zoomCursor) || actualDistance() < 2 || (distance === 2 && isEditingChildPath())
                }
                showContexts={showContexts}
                prevChild={filteredChildren[i - 1]}
                isParentHovering={isParentHovering}
                style={Object.keys(style).length > 0 ? style : undefined}
                path={appendedChildPath}
                simplePath={childPath}
                isMultiColumnTable={isMultiColumnTable}
                isHeader={isHeader}
              />
            ) : null
          })}
          {dropTarget(
            <li
              className={classNames({
                child: true,
                'drop-end': true,
                last: depth === 0,
              })}
              style={{ display: globals.simulateDrag || isDragInProgress ? 'list-item' : 'none' }}
            >
              <span
                className='drop-hover'
                style={{
                  display: (globals.simulateDropHover || isHovering) && !cursorOnAlphabeticalSort ? 'inline' : 'none',
                }}
              ></span>
            </li>,
          )}
        </ul>
      ) : (
        <EmptyChildrenDropTarget
          isThoughtDivider={isDivider(value)}
          depth={depth}
          dropTarget={dropTarget}
          isDragInProgress={isDragInProgress}
          isHovering={isHovering}
        />
      )}
      {isPaginated && distance !== 2 && (
        <a className='indent text-note' onClick={() => setPage(page + 1)}>
          More...
        </a>
      )}
    </>
  )
}

SubthoughtsComponent.displayName = 'SubthoughtComponent'

const Subthoughts = connect(mapStateToProps)(
  DropTarget('thought', { canDrop, drop }, dropCollect)(SubthoughtsComponent),
)

export default Subthoughts
