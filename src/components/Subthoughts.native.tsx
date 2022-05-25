import React, { useState } from 'react'
import { connect, useStore } from 'react-redux'
import { store } from '../store'
import { shortcutById } from '../shortcuts'
import globals from '../globals'
import { MAX_DEPTH, MAX_DISTANCE_FROM_CURSOR, VIEW_MODE } from '../constants'
import Thought from './Thought'
import GestureDiagram from './GestureDiagram'
import {
  ThoughtId,
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
  // appendToPath,
  checkIfPathShareSubcontext,
  contextToThoughtId,
  // ellipsize,
  // equalArrays,
  equalPath,
  hashPath,
  head,
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
  getGlobalSortPreference,
  isContextViewActive,
  rootedParentOf,
} from '../selectors'
import { View } from 'moti'
import { Text } from './Text.native'
import { commonStyles } from '../style/commonStyles'
import { TouchableOpacity } from 'react-native'
import { getAllChildrenAsThoughtsById } from '../selectors/getChildren'

/** The type of the exported Subthoughts. */
interface SubthoughtsProps {
  allowSingleContext?: boolean
  allowSingleContextParent?: boolean
  childrenForced?: ThoughtId[]
  depth?: number
  env?: Index<Context>
  expandable?: boolean
  isParentHovering?: boolean
  showContexts?: boolean
  sortType?: string
  sortDirection?: SortDirection | null
  simplePath: SimplePath
  path?: Path
  view?: string | null
}

// assert shortcuts at load time
const subthoughtShortcut = shortcutById('newSubthought')
if (!subthoughtShortcut) throw new Error('newSubthought shortcut not found.')
// @MIGRATION_TODO: context view is disabled for migration
// const toggleContextViewShortcut = shortcutById('toggleContextView')
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

  const hashedPath = hashPath(resolvedPath)

  const allChildren = getAllChildren(state, contextLive)

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
      (parentChildrenAttributeId && attributeEquals(state, parentChildrenAttributeId, '=focus', 'Zoom')) ||
      findFirstEnvContextWithZoom(state, { id: head(cursor), env }))

  const zoomParent =
    cursor &&
    (attributeEquals(state, head(rootedParentOf(state, cursor)), '=focus', 'Zoom') ||
      (grandparentChildrenAttributeId && attributeEquals(state, grandparentChildrenAttributeId, '=focus', 'Zoom')) ||
      findFirstEnvContextWithZoom(state, { id: head(rootedParentOf(state, cursor)), env }))

  return {
    contextBinding,
    distance,
    env,
    isEditingAncestor: isEditingPath && !isEditing,
    showContexts,
    showHiddenThoughts,
    simplePath: simplePathLive,
    // expand thought due to cursor and hover expansion
    isExpanded: !!store.getState().expanded[hashedPath] || !!expandedBottom?.[hashedPath],
    isAbsoluteContext,
    zoomCursor,
    zoomParent,
    // Re-render if children change.
    // Uses getAllChildren for efficient change detection. Probably does not work in context view.
    // Not used by render function, which uses a more complex calculation of children that supports context view.
    __allChildren: allChildren,
    // We need to re-render when actualDistance changes, but it is complicated and expensive.
    // Until actualDistance gets refactored and optimized, we can provide a quick fix for any observed rendering issues.
    // The only rendering issue observed so far is when the cursor changes from a leaf thought in the home context (actualDistance: 1) to null (actualDistance: 0).
    // This is especially fragile since other code may accidentally rely on this to re-render the component.
    // If optimizing or testing re-rendering, it would be best to remove this line.
    __noCursorRoot: isRoot(simplePath) && state.cursor === null,
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

//    const newPath = appendToPath(thoughtsTo, {
//      ...head(thoughtsFrom),
//      rank: dropPlacement === 'top' ? getPrevRank(state, contextTo) : getNextRank(state, contextTo),
//    })

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
//       globals.errorTimer = setTimeout(() => store.dispatch(alert(null)), 5000)
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
  children: ThoughtId[]
  simplePath: SimplePath
}) => {
  const store = useStore<State>()

  return (
    <View>
      <Text> This thought is not found in any {children.length === 0 ? '' : 'other'} contexts.</Text>

      <Text>
        <Text>
          Swipe <GestureDiagram path={subthoughtShortcut?.gesture as GesturePath} size={30} color='darkgray' />
        </Text>
        to add "{headValue(store.getState(), simplePath)}" to a new context.
      </Text>

      {
        allowSingleContext ? 'A floating context... how interesting.' : null
        // @MIGRATION_NOTE: toogle view is disabled for the migration
        // <Text>
        //   Swipe
        //   <GestureDiagram
        //     path={toggleContextViewShortcut.gesture as GesturePath}
        //     size={30}
        //     color='darkgray' /* mtach .children-subheading color */
        //   />
        //   to return to the normal view.
        // </Text>
      }
    </View>
  )
}

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
  view,
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
  const thoughtId = head(simplePath)
  //  const value = headValue(simplePath)
  const resolvedPath = path ?? simplePath

  const show = depth < MAX_DEPTH && (isEditingAncestor || isExpanded)

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
      ? getContextsSortedAndRanked(state, headValue(state, simplePath))
      : sortPreference?.type !== 'None'
      ? getAllChildrenSorted(state, thoughtId) // TODO: contextBinding
      : getChildrenRankedById(state, thoughtId) // TODO: contextBinding

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
    }, {} as Index<ThoughtId[] | ThoughtContext[]>)
  }

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
  // expand root, editing path, and contexts previously marked for expansion in setCursor

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

  const childrenAttributeId = findDescendant(state, thoughtId, ['=children'])
  const grandchildrenAttributeId = findDescendant(state, thoughtId, ['=grandchildren'])
  const hideBulletsChildren = childrenAttributeId && attribute(state, childrenAttributeId, '=bullet') === 'None'
  const hideBulletsGrandchildren =
    grandchildrenAttributeId && attribute(state, grandchildrenAttributeId, '=bullet') === 'None'
  // const cursorOnAlphabeticalSort = cursor && getSortPreference(state, context).type === 'Alphabetical'

  return (
    <>
      {contextBinding && showContexts ? (
        <Text style={commonStyles.whiteText}>(Bound to {pathToContext(state, contextBinding!)?.join('/')})</Text>
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

      {show && filteredChildren.length > (showContexts && !allowSingleContext ? 1 : 0)
        ? filteredChildren.map((child, i) => {
            if (i >= proposedPageSize) {
              return null
            }

            const childPath = getChildPath(state, child.id, simplePath, showContexts)
            const childEnvZoomId = once(() => {
              const context = findFirstEnvContextWithZoom(state, { id: child.id, env })
              return context && contextToThoughtId(state, context)
            })

            /** Returns true if the cursor in in the child path. */
            const isEditingChildPath = () => isDescendantPath(state.cursor, childPath)

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

            /** Gets the =focus/Zoom/=style of the child path. */

            /** Gets the style of the Zoom applied via env. */

            const style = {
              marginRight: 20,
            }

            const isTableView = view === VIEW_MODE.Table
            const isProseView = view === VIEW_MODE.Prose

            return child ? (
              <View key={`${child.id || child.rank}${child.id ? '-context' : ''}`} style={[{ marginLeft: depth * 25 }]}>
                <Thought
                  allowSingleContext={allowSingleContextParent}
                  depth={depth + 1}
                  env={env}
                  hideBullet={
                    isProseView || hideBulletsChildren || hideBulletsGrandchildren || hideBullet() || hideBulletZoom()
                  }
                  isParentHovering={isParentHovering}
                  isVisible={actualDistance() < 2}
                  prevChild={filteredChildren[i - 1]}
                  rank={child.rank}
                  showContexts={showContexts}
                  simplePath={childPath}
                  style={isTableView ? style : {}}
                  path={appendChildPath(state, childPath, path)}
                  view={view}
                />
              </View>
            ) : null
          })
        : null}

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
