import React, { useState } from 'react'
import { connect } from 'react-redux'
import { store } from '../store'
import { isTouch } from '../browser'
import { formatKeyboardShortcut, shortcutById } from '../shortcuts'
import globals from '../globals'
import { MAX_DEPTH, MAX_DISTANCE_FROM_CURSOR } from '../constants'
import Thought from './Thought'
import GestureDiagram from './GestureDiagram'
import {
  Child,
  Context,
  GesturePath,
  Index,
  LazyEnv,
  Path,
  SimplePath,
  SortDirection,
  State,
  ThoughtContext,
} from '../@types'

// util
import {
  checkIfPathShareSubcontext,
  // ellipsize,
  // equalArrays,
  equalPath,
  hashContext,
  // head,
  headValue,
  isAbsolute,
  isDescendant,
  isDescendantPath,
  // isDivider,
  // isEM,
  isFunction,
  isRoot,
  once,
  parentOf,
  parseJsonSafe,
  parseLet,
  pathToContext,
  sumSubthoughtsLength,
  unroot,
} from '../util'

// selectors
import {
  appendChildPath,
  attribute,
  attributeEquals,
  childrenFilterPredicate,
  getAllChildren,
  getAllChildrenSorted,
  getChildPath,
  getChildren,
  getChildrenRanked,
  getContextsSortedAndRanked,
  getEditingPath,
  getGlobalSortPreference,
  // getNextRank,
  // getPrevRank,
  // getSortPreference,
  getStyle,
  isContextViewActive,
  rootedParentOf,
} from '../selectors'
import { View } from 'moti'
import { Text } from './Text.native'
import { commonStyles } from '../style/commonStyles'
import { TouchableOpacity } from 'react-native'

/** The type of the exported Subthoughts. */
interface SubthoughtsProps {
  allowSingleContext?: boolean
  allowSingleContextParent?: boolean
  childrenForced?: Child[]
  count?: number
  depth?: number
  env?: Index<Context>
  expandable?: boolean
  isParentHovering?: boolean
  showContexts?: boolean
  sortType?: string
  sortDirection?: SortDirection | null
  simplePath: SimplePath
  path?: Path
}

// assert shortcuts at load time
const subthoughtShortcut = shortcutById('newSubthought')
const toggleContextViewShortcut = shortcutById('toggleContextView')
if (!subthoughtShortcut) throw new Error('newSubthought shortcut not found.')
if (!toggleContextViewShortcut) throw new Error('toggleContextView shortcut not found.')

const PAGINATION_SIZE = 100
const EMPTY_OBJECT = {}

/** Check if the given path is a leaf. */
const isLeaf = (state: State, context: Context) => getChildren(state, context).length === 0

/** Finds the the first env context with =focus/Zoom. */
const findFirstEnvContextWithZoom = (
  state: State,
  { context, env }: { context: Context; env: LazyEnv },
): Context | null => {
  const children = getAllChildren(state, context)
  const child = children.find(
    child => isFunction(child.value) && child.value in env && attribute(state, env[child.value], '=focus') === 'Zoom',
  )
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
  const thoughtsLive = pathToContext(pathLive)
  const showContexts = props.showContexts || isContextViewActive(state, thoughtsLive)
  const showContextsParent = isContextViewActive(state, parentOf(thoughtsLive))

  const simplePath = showContexts && showContextsParent ? parentOf(props.simplePath) : props.simplePath

  // use live thoughts if editing
  // if editing, replace the head with the live value from the cursor
  const simplePathLive = isEditing && !showContextsParent ? getEditingPath(state, props.simplePath) : simplePath
  const contextLive = pathToContext(simplePathLive)
  const cursorContext = cursor ? pathToContext(cursor) : null

  const contextBinding = parseJsonSafe(attribute(state, contextLive, '=bindContext') ?? '', undefined) as
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

  const contextHash = hashContext(pathToContext(resolvedPath))

  const children = getAllChildren(state, contextLive)

  // merge ancestor env into self env
  // only update the env object reference if there are new additions to the environment
  // otherwise props changes and causes unnecessary re-renders
  const envSelf = parseLet(state, pathToContext(simplePath))
  const env = Object.keys(envSelf).length > 0 ? { ...props.env, ...envSelf } : props.env || EMPTY_OBJECT

  /*
    When =focus/Zoom is set on the cursor or parent of the cursor, change the autofocus so that it hides the level above.
    1. Force actualDistance to 2 to hide thoughts.
    2. Set zoomCursor and zoomParent CSS classes to handle siblings.
  */
  const zoomCursor =
    cursorContext &&
    (attributeEquals(state, cursorContext, '=focus', 'Zoom') ||
      attributeEquals(state, parentOf(cursorContext).concat('=children'), '=focus', 'Zoom') ||
      findFirstEnvContextWithZoom(state, { context: cursorContext, env }))

  const zoomParent =
    cursorContext &&
    (attributeEquals(state, parentOf(cursorContext), '=focus', 'Zoom') ||
      attributeEquals(state, parentOf(parentOf(cursorContext)).concat('=children'), '=focus', 'Zoom') ||
      findFirstEnvContextWithZoom(state, { context: pathToContext(rootedParentOf(state, cursor!)), env }))

  return {
    contextBinding,
    distance,
    env,
    isEditingAncestor: isEditingPath && !isEditing,
    showContexts,
    showHiddenThoughts,
    simplePath: simplePathLive,
    // expand thought due to cursor and hover expansion
    isExpanded: !!store.getState().expanded[contextHash] || !!expandedBottom?.[contextHash],
    isAbsoluteContext,
    zoomCursor,
    zoomParent,
    // re-render if children change
    __render: children,
  }
}

// TODO:
/********************************************************************
 * Drag and Drop
 ********************************************************************/

/** Returns true if a thought can be dropped in this context. Dropping at end of list requires different logic since the default drop moves the dragged thought before the drop target. */
// const canDrop = (props: SubthoughtsProps, monitor: DropTargetMonitor) => {
//   const { simplePath: thoughtsFrom } = monitor.getItem() as { simplePath: SimplePath }
//   const thoughtsTo = props.simplePath
//   const { cursor, expandHoverTopPath } = store.getState()

//   const { path } = props

//   /** If the epxand hover top is active then all the descenendants of the current active expand hover top path should be droppable. */
//   const isExpandedTop = () =>
//     path && expandHoverTopPath && path.length >= expandHoverTopPath.length && isDescendantPath(path, expandHoverTopPath)

//   const distance = cursor ? cursor.length - thoughtsTo.length : 0
//   const isHidden = distance >= 2 && !isExpandedTop()

//   // there is no self thought to check since this is <Subthoughts>
//   const isDescendant = isDescendantPath(thoughtsTo, thoughtsFrom)
//   const divider = isDivider(headValue(thoughtsTo))

//   // do not drop on descendants or thoughts hidden by autofocus
//   return !isHidden && !isDescendant && !divider
// }

// // eslint-disable-next-line jsdoc/require-jsdoc
// const drop = (props: SubthoughtsProps, monitor: DropTargetMonitor) => {
//   const state = store.getState()

//   // no bubbling
//   if (monitor.didDrop() || !monitor.isOver({ shallow: true })) return

//   const { simplePath: thoughtsFrom } = monitor.getItem() as { simplePath: SimplePath }
//   const thoughtsTo = props.simplePath
//   const contextTo = pathToContext(thoughtsTo)
//   const dropPlacement = attribute(state, contextTo, '=drop') === 'top' ? 'top' : 'bottom'

//   const newPath = unroot([
//     ...thoughtsTo,
//     {
//       ...head(thoughtsFrom),
//       rank: dropPlacement === 'top' ? getPrevRank(state, contextTo) : getNextRank(state, contextTo),
//     },
//   ])

//   const isRootOrEM = isRoot(thoughtsFrom) || isEM(thoughtsFrom)
//   const oldContext = rootedParentOf(state, pathToContext(thoughtsFrom))
//   const newContext = rootedParentOf(state, pathToContext(newPath))
//   const sameContext = equalArrays(oldContext, newContext)

//   // cannot drop on itself
//   if (equalPath(thoughtsFrom, newPath)) return

//   // cannot move root or em context or target is divider
//   if (isDivider(headValue(thoughtsTo)) || (isRootOrEM && !sameContext)) {
//     store.dispatch(
//       error({ value: `Cannot move the ${isEM(thoughtsFrom) ? 'em' : 'home'} context to another context.` }),
//     )
//     return
//   }

//   store.dispatch(
//     props.showContexts
//       ? {
//           type: 'createThought',
//           value: headValue(thoughtsTo),
//           context: pathToContext(thoughtsFrom),
//           rank: getNextRank(state, pathToContext(thoughtsFrom)),
//         }
//       : {
//           type: 'moveThought',
//           oldPath: thoughtsFrom,
//           newPath,
//         },
//   )

//   // alert user of move to another context
//   if (!sameContext) {
//     // wait until after MultiGesture has cleared the error so this alert does no get cleared
//     setTimeout(() => {
//       const alertFrom = '"' + ellipsize(headValue(thoughtsFrom)) + '"'
//       const alertTo = isRoot(newContext) ? 'home' : '"' + ellipsize(headValue(thoughtsTo)) + '"'

//       store.dispatch(alert(`${alertFrom} moved to ${alertTo}.`))
//       clearTimeout(globals.errorTimer)
//       globals.errorTimer = window.setTimeout(() => store.dispatch(alert(null)), 5000)
//     }, 100)
//   }
// }

// eslint-disable-next-line jsdoc/require-jsdoc
// const dropCollect = (connect: DropTargetConnector, monitor: DropTargetMonitor) => ({
//   dropTarget: connect.dropTarget(),
//   isDragInProgress: monitor.getItem() as boolean,
//   isHovering: monitor.isOver({ shallow: true }) && monitor.canDrop(),
// })

/********************************************************************
 * Component
 ********************************************************************/

// Todo: Look into the No Child Component implementation.
/** A message that says there are no children in this context. */
const NoChildren = ({
  allowSingleContext,
  children,
  simplePath,
}: {
  allowSingleContext?: boolean
  children: Child[]
  simplePath: SimplePath
}) => (
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
      to add "{headValue(simplePath)}" to a new context.
    </span>
    <br />
    {allowSingleContext ? (
      'A floating context... how interesting.'
    ) : (
      <span>
        {isTouch ? (
          <span className='gesture-container'>
            Swipe{' '}
            <GestureDiagram
              path={toggleContextViewShortcut.gesture as GesturePath}
              size={30}
              color='darkgray' /* mtach .children-subheading color */
            />
          </span>
        ) : (
          <span>Type {formatKeyboardShortcut(toggleContextViewShortcut.keyboard!)}</span>
        )}{' '}
        to return to the normal view.
      </span>
    )}
  </div>
)

/** A drop target when there are no children in a context. Otherwise no drop target would be rendered in an empty context. */
// const EmptyChildrenDropTarget = ({
//   depth,
//   dropTarget,
//   isDragInProgress,
//   isHovering,
//   isThoughtDivider,
// }: {
//   depth?: number
//   dropTarget: ConnectDropTarget
//   isDragInProgress?: boolean
//   isHovering?: boolean
//   isThoughtDivider?: boolean
// }) => (
//   <ul className='empty-children' style={{ display: globals.simulateDrag || isDragInProgress ? 'block' : 'none' }}>
//     {dropTarget(
//       <li
//         className={classNames({
//           child: true,
//           'drop-end': true,
//           'inside-divider': isThoughtDivider,
//           last: depth === 0,
//         })}
//       >
//         <span
//           className='drop-hover'
//           style={{ display: globals.simulateDropHover || isHovering ? 'inline' : 'none' }}
//         ></span>
//       </li>,
//     )}
//   </ul>
// )
// Todo: draggable thoughts.
// EmptyChildrenDropTarget.displayName = 'EmptyChildrenDropTarget'

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
  // dropTarget,
  env,
  // isDragInProgress,
  isEditingAncestor,
  // isHovering,
  isParentHovering,
  showContexts,
  sortDirection: contextSortDirection,
  sortType: contextSortType,
  simplePath,
  isExpanded,
  zoomCursor,
  zoomParent,
}: SubthoughtsProps & ReturnType<typeof mapStateToProps>) => {
  // <Subthoughts> render
  const state = store.getState()
  const [page, setPage] = useState(1)
  const globalSort = getGlobalSortPreference(state)
  const sortPreference =
    (contextSortType && {
      type: contextSortType,
      direction: contextSortDirection,
    }) ||
    globalSort
  const { cursor } = state
  const context = pathToContext(simplePath)
  //  const value = headValue(simplePath)
  const resolvedPath = path ?? simplePath

  const show = depth < MAX_DEPTH && (isEditingAncestor || isExpanded)
  // console.log({ depth: MAX_DEPTH })

  // useEffect(() => {
  //   if (isHovering) {
  //     store.dispatch(
  //       dragInProgress({
  //         value: true,
  //         draggingThought: state.draggingThought,
  //         hoveringPath: path,
  //         hoverId: DROP_TARGET.EmptyDrop,
  //       }),
  //     )
  //   }
  // }, [isHovering])

  // disable intrathought linking until add, edit, delete, and expansion can be implemented
  // const subthought = once(() => getSubthoughtUnderSelection(headValue(simplePath), 3))
  const children =
    childrenForced || showContexts
      ? getContextsSortedAndRanked(state, headValue(simplePath))
      : sortPreference?.type !== 'None'
      ? getAllChildrenSorted(state, pathToContext(contextBinding || simplePath))
      : (getChildrenRanked(state, pathToContext(contextBinding || simplePath)) as (Child | ThoughtContext)[])

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
        [child.rank]: [...match, child],
      }
    }, {} as Index<Child[] | ThoughtContext[]>)
  }

  // Ensure that editable newThought is visible.
  const editIndex =
    cursor && children && show
      ? children.findIndex(child => {
          return cursor[depth] && cursor[depth].rank === child.rank
        })
      : 0

  const filteredChildren = children.filter(
    childrenFilterPredicate(state, resolvedPath, pathToContext(simplePath), showContexts),
  )

  const proposedPageSize = isRoot(simplePath) ? Infinity : PAGINATION_SIZE * page
  if (editIndex > proposedPageSize - 1) {
    setPage(page + 1)
    return null
  }
  const isPaginated = show && filteredChildren.length > proposedPageSize
  // expand root, editing path, and contexts previously marked for expansion in setCursor

  /** Returns true if editing a grandchild of the cursor whose parent is zoomed. */
  const zoomParentEditing = () =>
    // eslint-disable-next-line jsdoc/require-jsdoc
    cursor && cursor.length > 2 && zoomParent && equalPath(parentOf(parentOf(cursor)), resolvedPath)

  const zoom = isEditingAncestor && (zoomCursor || zoomParentEditing())

  const cursorContext = pathToContext(cursor || [])

  const isCursorLeaf = cursor && isLeaf(state, cursorContext)

  const maxDistance = MAX_DISTANCE_FROM_CURSOR - (isCursorLeaf ? 1 : 2)

  /** First visible thought at the top. */
  const firstVisiblePath = cursor?.slice(0, -maxDistance)

  const isDescendantOfFirstVisiblePath = isDescendant(
    pathToContext(firstVisiblePath || []),
    pathToContext(resolvedPath),
  )

  const cursorSubcontextIndex = checkIfPathShareSubcontext(cursor || [], resolvedPath)

  const isAncestorOfCursor =
    cursor && resolvedPath.length === cursorSubcontextIndex + 1 && cursor?.length > resolvedPath.length

  const isDescendantOfCursor =
    cursor && cursor.length === cursorSubcontextIndex + 1 && resolvedPath.length > cursor?.length

  const isCursor = cursor && resolvedPath.length === cursorSubcontextIndex + 1 && resolvedPath.length === cursor?.length
  const isCursorParent = cursor && isAncestorOfCursor && cursor.length - resolvedPath.length === 1

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

  /*
    Note: The following properties is applied to the immediate childrens with given class.

    distance-from-cursor-0 fully visible
    distance-from-cursor-1 dimmed
    distance-from-cursor-2 shifted left and hidden
    distance-from-cursor-3 shiifted left and hidden

    Note: This doesn't fully account for the visibility. There are other additional classes that can affect opacity. For example cursor and its expanded descendants are always visible with full opacity.
  */
  const actualDistance = shouldShiftAndHide || zoom ? 2 : shouldDim ? 1 : distance

  const contextChildren = [...unroot(context), '=children'] // children of parent with =children
  const contextGrandchildren = [...unroot(parentOf(context)), '=grandchildren'] // context of grandparent with =grandchildren
  const styleChildren = getStyle(state, contextChildren)
  const styleGrandChildren = getStyle(state, contextGrandchildren)
  const hideBulletsChildren = attribute(state, contextChildren, '=bullet') === 'None'
  const hideBulletsGrandchildren = attribute(state, contextGrandchildren, '=bullet') === 'None'
  // const cursorOnAlphabeticalSort = cursor && getSortPreference(state, context).type === 'Alphabetical'

  return (
    <>
      {contextBinding && showContexts ? (
        <Text style={commonStyles.whiteText}>(Bound to {pathToContext(contextBinding!)?.join('/')})</Text>
      ) : null}
      {show && showContexts && !(filteredChildren.length === 0 && isRoot(simplePath)) ? (
        filteredChildren.length < (allowSingleContext ? 1 : 2) ? (
          // No children
          <NoChildren allowSingleContext={allowSingleContext} children={children as Child[]} simplePath={simplePath} />
        ) : null
      ) : null}

      {show && filteredChildren.length > (showContexts && !allowSingleContext ? 1 : 0) ? (
        <View style={{ marginLeft: depth * 25 }}>
          {filteredChildren.map((child, i) => {
            if (i >= proposedPageSize) {
              return null
            }

            const childPath = getChildPath(state, child, simplePath, showContexts)
            const childContext = pathToContext(childPath)
            const childContextEnvZoom = once(() => findFirstEnvContextWithZoom(state, { context: childContext, env }))
            /** Returns true if the cursor in in the child path. */
            const isEditingChildPath = () => isDescendantPath(state.cursor, childPath)

            /** Returns true if the bullet should be hidden. */
            const hideBullet = () => attribute(state, childContext, '=bullet') === 'None'

            /** Returns true if the bullet should be hidden if zoomed. */
            const hideBulletZoom = (): boolean =>
              isEditingChildPath() &&
              (attribute(state, [...childContext, '=focus', 'Zoom'], '=bullet') === 'None' ||
                (!!childContextEnvZoom() && attribute(state, childContextEnvZoom()!, '=bullet') === 'None'))

            /** Gets the =focus/Zoom/=style of the child path. */
            const styleZoom = () => getStyle(state, [...childContext, '=focus', 'Zoom'])

            /** Gets the style of the Zoom applied via env. */
            const styleEnvZoom = () => (childContextEnvZoom() ? getStyle(state, childContextEnvZoom()!) : null)

            const style = {
              styleGrandChildren,
              styleChildren,
              ...(isEditingChildPath()
                ? {
                    ...styleZoom(),
                    ...styleEnvZoom(),
                  }
                : null),
            }

            return child ? (
              <Thought
                allowSingleContext={allowSingleContextParent}
                count={count + sumSubthoughtsLength(children)}
                depth={depth + 1}
                env={env}
                hideBullet={hideBulletsChildren || hideBulletsGrandchildren || hideBullet() || hideBulletZoom()}
                key={`${child.id || child.rank}${(child as ThoughtContext).context ? '-context' : ''}`}
                rank={child.rank}
                isDraggable={actualDistance < 2}
                showContexts={showContexts}
                prevChild={filteredChildren[i - 1]}
                isParentHovering={isParentHovering}
                style={Object.keys(style).length > 0 ? style : undefined}
                path={appendChildPath(state, childPath, path)}
                simplePath={childPath}
              />
            ) : null
          })}
        </View>
      ) : null}

      {isPaginated && distance !== 2 && (
        <TouchableOpacity style={commonStyles.row}>
          <Text style={commonStyles.whiteText} onPress={() => setPage(page + 1)}>
            More...
          </Text>
        </TouchableOpacity>
      )}
    </>
  )
}

SubthoughtsComponent.displayName = 'SubthoughtComponent'

const Subthoughts = connect(mapStateToProps)(SubthoughtsComponent)

export default Subthoughts
