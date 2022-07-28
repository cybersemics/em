import Context from '../@types/Context'
import Index from '../@types/IndexType'
import Path from '../@types/Path'
import State from '../@types/State'
import ThoughtContext from '../@types/ThoughtContext'
import ThoughtId from '../@types/ThoughtId'
import { EXPAND_THOUGHT_CHAR, HOME_PATH, HOME_TOKEN, MAX_DISTANCE_FROM_CURSOR, MAX_EXPAND_DEPTH } from '../constants'
import attribute from '../selectors/attribute'
import attributeEquals from '../selectors/attributeEquals'
import contextToThoughtId from '../selectors/contextToThoughtId'
import findDescendant from '../selectors/findDescendant'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import simplifyPath from '../selectors/simplifyPath'
import appendToPath from '../util/appendToPath'
import equalArrays from '../util/equalArrays'
import hashPath from '../util/hashPath'
import head from '../util/head'
import isAttribute from '../util/isAttribute'
import isDescendant from '../util/isDescendant'
import isURL from '../util/isURL'
import keyValueBy from '../util/keyValueBy'
import parentOf from '../util/parentOf'
import pathToContext from '../util/pathToContext'
import publishMode from '../util/publishMode'
import strip from '../util/strip'
import unroot from '../util/unroot'
import childIdsToThoughts from './childIdsToThoughts'
import { getAllChildren, getAllChildrenAsThoughts } from './getChildren'
import getContexts from './getContexts'
import parentOfThought from './parentOfThought'

/** Get the value of the Child | ThoughtContext. */
const childValue = (state: State, child: ThoughtId | ThoughtContext, showContexts: boolean) =>
  showContexts ? parentOfThought(state, child)!.value : getThoughtById(state, child)?.value

/** Returns true if the context is in table view. */
const isTable = (state: State, id: ThoughtId) => attributeEquals(state, id, '=view', 'Table')

/** Returns the value of =children/=pin. */
const pinChildren = (state: State, id: ThoughtId) => {
  const childrenAttributeId = findDescendant(state, id, '=children')
  return childrenAttributeId ? attribute(state, childrenAttributeId, '=pin') : null
}

/** Returns true if the context is the first column in a table view. */
const isTableColumn1 = (state: State, path: Path) => attributeEquals(state, head(parentOf(path)), '=view', 'Table')

/**
 * Check for =publish/=attributes/=children/=pin in publish mode.
 * Note: Use 'pinChildren' so it is not interpreted in editing mode.
 */
const publishPinChildren = (state: State, context: Context) => {
  const id = contextToThoughtId(state, unroot([...context, '=publish', '=attributes']) as Context)
  return id && publishMode() && findDescendant(state, id, ['=children', '=pin', 'true'])
}

function expandThoughts(state: State, path: Path | null): Index<Path>
function expandThoughts<B extends boolean>(
  state: State,
  path: Path | null,
  options?: { returnContexts?: B },
): Index<B extends true ? Context : Path>

/** Returns an expansion map marking all contexts that should be expanded when for the given path.
 *
 * @param suppressExpansion - Prevents expansion of non pinned expansion path.
 * @example {
 *   [hashContext(context)]: true,
 *   [hashContext([...context, childA])]: true,
 *   [hashContext([...context, childB])]: true,
 *   [hashContext([...context, childC])]: true,
 *   ...
 * }
 */
function expandThoughts(
  state: State,
  path: Path | null,
  options?: { returnContexts?: boolean },
): Index<Path | Context> {
  const firstVisibleThoughtPath = path && (path.slice(0, -MAX_DISTANCE_FROM_CURSOR) as Path)
  const expansionStartingPath =
    firstVisibleThoughtPath && firstVisibleThoughtPath.length !== 0 ? firstVisibleThoughtPath : HOME_PATH

  if (path && !getThoughtById(state, head(path))) {
    throw new Error(`Invalid path ${path}. No thought found with id ${head(path)}`)
  }

  return expandThoughtsRecursive(state, path || HOME_PATH, expansionStartingPath || HOME_PATH, options)
}

/**
 * Recursively generate expansion map based by checking if the children of the current path should expand based on the given expansion path.
 *
 * @param expansionBasePath - The base path for the original, nonrecursive call to expandThoughts.
 * @param path - Current path.
 */
function expandThoughtsRecursive(
  state: State,
  expansionBasePath: Path,
  path: Path,
  { returnContexts }: { returnContexts?: boolean } = {},
): Index<Path | Context> {
  // Note: depth is relative to the expansion path.
  const depth = path.length - expansionBasePath.length

  if (
    // arbitrarily limit depth to prevent infinite context view expansion (i.e. cycles)
    depth > MAX_EXPAND_DEPTH
  )
    return {}

  if (path && path.length === 0) {
    // log error instead of throwing since it can cause the pullQueue to enter an infinite loop
    console.error(new Error('expandThoughtsRecursive: Invalid empty Path received.'))
    return {}
  } else if (path && path.length > 1 && path[0] === HOME_TOKEN) {
    // log error instead of throwing since it can cause the pullQueue to enter an infinite loop
    console.error(new Error('expandThoughtsRecursive: Invalid Path; Non-root Paths should omit ' + HOME_TOKEN))
    return {}
  }

  const simplePath = !path || path.length === 0 ? HOME_PATH : simplifyPath(state, path)
  const thoughtId = head(path)
  const thought = getThoughtById(state, thoughtId)
  const context = pathToContext(state, path)
  const showContexts = isContextViewActive(state, path)
  const childrenUnfiltered = showContexts
    ? childIdsToThoughts(state, getContexts(state, thought.value))
    : // when getting normal view children, make sure to use simplePath head rather than path head
      // otherwise it will retrieve the children of the context view, not the children of the context instance
      // See ContextView test "Expand grandchildren of contexts"
      getAllChildrenAsThoughts(state, head(simplePath))

  // Note: A path that is ancestor of the expansion path or expansion path itself should always be expanded.
  const visibleChildren = state.showHiddenThoughts
    ? childrenUnfiltered
    : childrenUnfiltered.filter(child => {
        // const valueRaw = childValue(state, child, showContexts)
        const valueRaw = child.value
        if (valueRaw == null) {
          console.error('Invalid child', child)
          console.error('Children', childrenUnfiltered)
        }

        const value = strip(valueRaw)

        const childPath = unroot([...path, child.id])

        /** Check of the path is the ancestor of the expansion path. */
        const isAncestor = () => isDescendant(childPath, expansionBasePath)

        /** Check if the path is equal to the expansion path. */
        const isExpansionBasePath = () => equalArrays(childPath, expansionBasePath)

        return (
          (!isAttribute(value) && attribute(state, child.id, '=pin') !== 'false') ||
          isExpansionBasePath() ||
          isAncestor()
        )
      })

  // expand if child is only child and its child is not url
  const firstGrandchildren = visibleChildren.length > 0 ? getAllChildren(state, visibleChildren[0].id) : []
  const isOnlyChildNoUrl =
    firstGrandchildren.length > 0 &&
    visibleChildren.length === 1 &&
    !isTableColumn1(state, simplePath) &&
    (firstGrandchildren.length >= 1 || !isURL(childValue(state, firstGrandchildren[0], showContexts)))

  const childrenPinned =
    isTable(state, thoughtId) ||
    (isOnlyChildNoUrl && pinChildren(state, thoughtId) !== 'false') ||
    pinChildren(state, thoughtId) === 'true' ||
    publishPinChildren(state, simplePath)
      ? visibleChildren
      : visibleChildren.filter(child => {
          const childPath = path ? appendToPath(path, showContexts ? child.parentId : child.id) : ([child.id] as Path)

          /** Check of the path is the ancestor of the expansion path. */
          const isAncestor = () => isDescendant(childPath, expansionBasePath)

          /** Check if the path is equal to the expansion path. */
          const isExpansionBasePath = () => equalArrays(childPath, expansionBasePath)

          const isChildPinned = attribute(state, child.id, '=pin') === 'true'

          /**
            Only meta thoughts that are ancestor of expansionBasePath or expansionBasePath itself are visible when shouldHiddenThoughts is false. They are also automatically expanded.
            If state.showHiddenThoughts is false then for calculating visibleChildren those conditions are always checked for meta child.
            So this predicate prevents from recalculating isAncestor or isexpansionBasePath again by checking if those calculations are already done in visibleChildren logic.
           */
          const isEitherMetaAncestorOrCursor = () => !state.showHiddenThoughts && isAttribute(child.value)

          const strippedValue = strip(child.value)

          return (
            strippedValue[strippedValue.length - 1] === EXPAND_THOUGHT_CHAR ||
            isChildPinned ||
            isEitherMetaAncestorOrCursor() ||
            isExpansionBasePath() ||
            isAncestor()
          )
        })

  const initialExpanded = {
    // expand current thought
    [hashPath(path)]: returnContexts ? context : path,
  }

  return keyValueBy(
    childrenPinned,
    childOrContext => {
      const newPath = unroot([...path, showContexts ? childOrContext.parentId : childOrContext.id])
      return expandThoughtsRecursive(state, expansionBasePath, newPath, { returnContexts })
    },
    initialExpanded,
  )
}

export default expandThoughts
