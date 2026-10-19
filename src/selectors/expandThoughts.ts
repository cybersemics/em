import { uniqBy } from 'lodash'
import Context from '../@types/Context'
import Index from '../@types/IndexType'
import Path from '../@types/Path'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import { EXPAND_THOUGHT_CHAR, HOME_PATH, HOME_TOKEN, MAX_EXPAND_DEPTH } from '../constants'
import attributeEquals from '../selectors/attributeEquals'
import contextToThoughtId from '../selectors/contextToThoughtId'
import findDescendant from '../selectors/findDescendant'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import isMulticursorPath from '../selectors/isMulticursorPath'
import simplifyPath from '../selectors/simplifyPath'
import appendToPath from '../util/appendToPath'
import containsURL from '../util/containsURL'
import equalArrays from '../util/equalArrays'
import hashPath from '../util/hashPath'
import head from '../util/head'
import isAttribute from '../util/isAttribute'
import isDescendant from '../util/isDescendant'
import parentOf from '../util/parentOf'
import publishMode from '../util/publishMode'
import stripTags from '../util/stripTags'
import unroot from '../util/unroot'
import childIdsToThoughts from './childIdsToThoughts'
import { anyChild, getAllChildrenAsThoughts } from './getChildren'
import getContexts from './getContexts'
import pinned from './isPinned'
import rootedParentOf from './rootedParentOf'

/** Returns true if a thought is marked as done. */
const isDone = (state: State, id: ThoughtId | null): boolean => {
  return !!findDescendant(state, id, '=done')
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
 * Note: Use 'pinAll' so it is not interpreted in editing mode.
 */
const publishPinAll = (state: State, context: Context) => {
  if (!publishMode()) return false
  const id = contextToThoughtId(state, unroot([...context, '=publish', '=attributes']) as Context)
  return id && childrenPinned(state, id)
}
/**
 * Recursively generate expansion map from the given path. Always expands the given path, then calculates expansion of descendants.
 *
 * @param expansionBasePath - The base path for the original, nonrecursive call to expandThoughts.
 * @param path - Current path.
 * @param expanded - Expansion map shared by this traversal.
 * @param descendantsPinnedInherited - The effective =descendants/=pin state inherited from the nearest ancestor that sets it.
 */
function expandThoughtsRecursive(
  state: State,
  expansionBasePath: Path,
  path: Path,
  expanded: Index<Path | Context>,
  descendantsPinnedInherited: boolean | null = null,
): void {
  if (
    // arbitrarily limit depth to prevent infinite context view expansion (i.e. cycles)
    path.length - expansionBasePath.length + 1 >
    MAX_EXPAND_DEPTH
  )
    return

  if (path && path.length === 0) {
    // Report invalid navigation without crashing rendering.
    console.error(new Error('expandThoughtsRecursive: Invalid empty Path received.'))
    return
  } else if (path && path.length > 1 && path[0] === HOME_TOKEN) {
    // Report invalid navigation without crashing rendering.
    console.error(new Error('expandThoughtsRecursive: Invalid Path; Non-root Paths should omit ' + HOME_TOKEN))
    return
  }

  const simplePath = !path || path.length === 0 ? HOME_PATH : simplifyPath(state, path)
  const thoughtId = head(path)

  const showContexts = isContextViewActive(state, path)
  const thought = showContexts ? getThoughtById(state, thoughtId) : null
  const childrenUnfiltered = showContexts
    ? childIdsToThoughts(state, thought ? getContexts(state, thought.value) : [])
    : // when getting normal view children, make sure to use simplePath head rather than path head
      // otherwise it will retrieve the children of the context view, not the children of the context instance
      // See ContextView test "Expand grandchildren of contexts"
      getAllChildrenAsThoughts(state, head(simplePath))

  // Note: A path that is ancestor of the expansion path or expansion path itself should always be expanded.
  const visibleChildren = state.showHiddenThoughts
    ? childrenUnfiltered
    : childrenUnfiltered.filter(child => {
        if (!isAttribute(child.value)) return true
        const childPath = unroot([...path, child.id])
        return isDescendant(childPath, expansionBasePath) || equalArrays(childPath, expansionBasePath)
      })

  // Always expand the current thought; the remaining rules only decide which children to visit.
  expanded[hashPath(path)] = path
  if (visibleChildren.length === 0) return

  // the =descendants/=pin state that applies to this thought's children: the thought's own =descendants/=pin if set, otherwise the value inherited from the nearest ancestor that sets it
  const descendantsPinned =
    pinned(state, findDescendant(state, thoughtId, '=descendants')) ?? descendantsPinnedInherited
  const childrenPin = childrenPinned(state, thoughtId) ?? descendantsPinned

  // expand if child is an only child
  const grandchild = visibleChildren.length === 1 && anyChild(state, visibleChildren[0].id)
  const hasOnlyChild =
    visibleChildren.length === 1 &&
    grandchild &&
    !isTableColumn1(state, simplePath) &&
    // do not expand if grandchild is a url
    !containsURL(grandchild.value) &&
    // Do not expand only child when parent's subthoughts are pinned.
    // https://github.com/cybersemics/em/issues/1732
    !childrenPinned(state, head(parentOf(path))) &&
    // do not expand if thought or parent's subthoughts have =pin/false or =done
    pinned(state, visibleChildren[0].id) !== false &&
    !isDone(state, visibleChildren[0].id) &&
    childrenPin !== false

  const childrenExpanded =
    isTable(state, thoughtId) || hasOnlyChild || publishPinAll(state, simplePath)
      ? // all children are expanded
        visibleChildren
      : // some children expanded
        visibleChildren.filter(child => {
          const childPath = path ? appendToPath(path, showContexts ? child.parentId : child.id) : ([child.id] as Path)

          return (
            isDescendant(childPath, expansionBasePath) ||
            equalArrays(childPath, expansionBasePath) ||
            // Hidden attributes that passed visibleChildren are on the expansion path and always expand.
            (!state.showHiddenThoughts && isAttribute(child.value)) ||
            // Only apply : or =pin if not in context view
            (!showContexts &&
              (stripTags(child.value).endsWith(EXPAND_THOUGHT_CHAR) ||
                (pinned(state, child.id) ?? (childrenPin && !isDone(state, child.id)))))
          )
        })

  // Write into one result instead of copying each subtree's entries through all its ancestors.
  childrenExpanded.forEach(childOrContext => {
    const newPath = unroot([...path, showContexts ? childOrContext.parentId : childOrContext.id])
    // do not propagate =descendants/=pin into the context view, since the contexts' subtrees are outside the pinned subtree
    expandThoughtsRecursive(state, expansionBasePath, newPath, expanded, showContexts ? null : descendantsPinned)
  })
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

  // A selected thought expands only its ancestors, never itself, so that it stays collapsed while
  // remaining visible. This applies to the cursor too when it is part of the multicursor, which is the
  // case while a multiselect is being extended with Shift+ArrowUp/ArrowDown. A cursor that is not
  // selected expands normally.
  // https://github.com/cybersemics/em/issues/4738
  const cursorExpansionPath = path && isMulticursorPath(state, path) ? rootedParentOf(state, path) : path || HOME_PATH

  const expanded: Index<Path | Context> = {}
  uniqBy(
    [
      cursorExpansionPath,
      ...Object.values(state.multicursors).map(multicursorPath => rootedParentOf(state, multicursorPath)),
    ],
    hashPath,
  ).forEach(expansionPath => expandThoughtsRecursive(state, expansionPath, HOME_PATH, expanded))
  return expanded
}

export default expandThoughts
