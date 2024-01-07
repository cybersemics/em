import Context from '../@types/Context'
import Index from '../@types/IndexType'
import Path from '../@types/Path'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import { EXPAND_THOUGHT_CHAR, HOME_PATH, HOME_TOKEN, MAX_EXPAND_DEPTH } from '../constants'
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
import publishMode from '../util/publishMode'
import strip from '../util/strip'
import unroot from '../util/unroot'
import childIdsToThoughts from './childIdsToThoughts'
import { anyChild, getAllChildrenAsThoughts } from './getChildren'
import getContexts from './getContexts'

// pin state map
const pinStateMap = { false: false, true: true }

/** Returns true if a thought is pinned with =pin/true, false if =pin/false, and null if not pinned. */
const pinned = (state: State, id: ThoughtId | null): boolean | null => {
  const pinState = attribute(state, id, '=pin') as keyof typeof pinStateMap
  return pinStateMap[pinState] ?? null
}

/** Returns true if a thought's children are pinned with =children/=pin/true, false if =children/=pin/false, and null if not pinned. */
const childrenPinned = (state: State, id: ThoughtId): boolean | null => {
  const childrenAttributeId = findDescendant(state, id, '=children')
  return pinned(state, childrenAttributeId)
}

/** Returns true if the context is in table view. */
const isTable = (state: State, id: ThoughtId) => attributeEquals(state, id, '=view', 'Table')

/** Returns true if the context is the first column in a table view. */
const isTableColumn1 = (state: State, path: Path) => attributeEquals(state, head(parentOf(path)), '=view', 'Table')

/**
 * Check for =publish/=attributes/=children/=pin in publish mode.
 * Note: Use 'pinChildren' so it is not interpreted in editing mode.
 */
const publishPinChildren = (state: State, context: Context) => {
  const id = contextToThoughtId(state, unroot([...context, '=publish', '=attributes']) as Context)
  return id && publishMode() && childrenPinned(state, id)
}

function expandThoughts(state: State, path: Path | null): Index<Path>

/** Returns an expansion map marking all contexts that should be expanded when for the given path.
 *
 * @param suppressExpansion - Prevents expansion of non pinned expansion path.
 * @example {
 *   [hashContext(context)]: true,
 *   [hashContext([...context, childA])]: pathA,
 *   [hashContext([...context, childB])]: pathB,
 *   [hashContext([...context, childC])]: pathC,
 *   ...
 * }
 */
function expandThoughts(state: State, path: Path | null): Index<Path | Context> {
  if (path && !getThoughtById(state, head(path))) {
    throw new Error(`Invalid path ${path}. No thought found with id ${head(path)}`)
  }

  return expandThoughtsRecursive(state, path || HOME_PATH, HOME_PATH)
}

/**
 * Recursively generate expansion map from the given path. Always expands the given path, then calculates expansion of descendants.
 *
 * @param expansionBasePath - The base path for the original, nonrecursive call to expandThoughts.
 * @param path - Current path.
 */
function expandThoughtsRecursive(state: State, expansionBasePath: Path, path: Path): Index<Path | Context> {
  if (
    // arbitrarily limit depth to prevent infinite context view expansion (i.e. cycles)
    path.length - expansionBasePath.length + 1 >
    MAX_EXPAND_DEPTH
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
        const value = strip(child.value)
        const childPath = unroot([...path, child.id])

        /** Check of the path is the ancestor of the expansion path. */
        const isAncestor = () => isDescendant(childPath, expansionBasePath)

        /** Check if the path is equal to the expansion path. */
        const isExpansionBasePath = () => equalArrays(childPath, expansionBasePath)

        return !isAttribute(value) || isAncestor() || isExpansionBasePath()
      })

  // expand if child is an only child
  const grandchild = anyChild(state, visibleChildren[0]?.id)
  const hasOnlyChild =
    visibleChildren.length === 1 &&
    grandchild &&
    !isTableColumn1(state, simplePath) &&
    // do not expand if grandchild is a url
    !isURL(grandchild.value) &&
    // Do not expand only child when parent's subthoughts are pinned.
    // https://github.com/cybersemics/em/issues/1732
    !childrenPinned(state, head(parentOf(path))) &&
    // do not expand if thought or parent's subthoughts have =pin/false
    pinned(state, visibleChildren[0].id) !== false &&
    childrenPinned(state, thoughtId) !== false

  const childrenExpanded =
    isTable(state, thoughtId) || hasOnlyChild || publishPinChildren(state, simplePath)
      ? // all children are expanded
        visibleChildren
      : // some children expanded
        visibleChildren.filter(child => {
          const childPath = path ? appendToPath(path, showContexts ? child.parentId : child.id) : ([child.id] as Path)

          /** Check if the path is equal to the expansion path. */
          const isExpansionBasePath = () => equalArrays(childPath, expansionBasePath)

          /** Check of the path is the ancestor of the expansion path. */
          const isAncestor = () => isDescendant(childPath, expansionBasePath)

          /**
            Only meta thoughts that are ancestor of expansionBasePath or expansionBasePath itself are visible when shouldHiddenThoughts is false. They are also automatically expanded.
            If state.showHiddenThoughts is false then for calculating visibleChildren those conditions are always checked for meta child.
            So this predicate prevents from recalculating isAncestor or isexpansionBasePath again by checking if those calculations are already done in visibleChildren logic.
           */
          const isHiddenAttribute = () => !state.showHiddenThoughts && isAttribute(child.value)

          return (
            isAncestor() ||
            isExpansionBasePath() ||
            isHiddenAttribute() ||
            pinned(state, child.id) ||
            (childrenPinned(state, thoughtId) && pinned(state, child.id) === null) ||
            strip(child.value).endsWith(EXPAND_THOUGHT_CHAR)
          )
        })

  // always expand current thought
  const initialExpanded = {
    [hashPath(path)]: path,
  }

  // expand children (recursive)
  return keyValueBy(
    childrenExpanded,
    childOrContext => {
      const newPath = unroot([...path, showContexts ? childOrContext.parentId : childOrContext.id])
      return expandThoughtsRecursive(state, expansionBasePath, newPath)
    },
    initialExpanded,
  )
}

export default expandThoughts
