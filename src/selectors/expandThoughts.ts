import { EXPAND_THOUGHT_CHAR, HOME_PATH, HOME_TOKEN, MAX_DISTANCE_FROM_CURSOR, MAX_EXPAND_DEPTH } from '../constants'
import {
  attribute,
  attributeEquals,
  getAllChildren,
  getChildPath,
  getContexts,
  isContextViewActive,
  simplifyPath,
} from '../selectors'
import { Child, Context, Index, Path, State, ThoughtContext } from '../@types'
import {
  appendToPath,
  createId,
  equalArrays,
  equalThoughtRanked,
  head,
  headId,
  headValue,
  isDescendant,
  isFunction,
  isURL,
  keyValueBy,
  parentOf,
  pathToContext,
  publishMode,
  strip,
  unroot,
} from '../util'

/** Get the value of the Child | Th oughtContext. */
const childValue = (child: Child | ThoughtContext, showContexts: boolean) =>
  showContexts ? head((child as ThoughtContext).context) : (child as Child).value

/** Returns true if the context is in table view. */
const isTable = (state: State, context: Context) => attributeEquals(state, context, '=view', 'Table')

/** Returns true if all children of the context should be pinned open. */
const pinChildren = (state: State, context: Context) => attributeEquals(state, context, '=pinChildren', 'true')

/** Returns true if the context is the first column in a table view. */
const isTableColumn1 = (state: State, context: Context) => attributeEquals(state, parentOf(context), '=view', 'Table')

/**
 * Check for =publish/=attributes/pinChildren in publish mode.
 * Note: Use 'pinChildren' so it is not interpreted in editing mode.
 */
const publishPinChildren = (state: State, context: Context) =>
  publishMode() &&
  attributeEquals(state, unroot([...context, '=publish', '=attributes']) as Context, 'pinChildren', 'true')

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
  const expansionBasePath =
    firstVisibleThoughtPath && firstVisibleThoughtPath.length !== 0 ? firstVisibleThoughtPath : HOME_PATH

  return expandThoughtsRecursive(state, path || HOME_PATH, expansionBasePath, options)
}

/**
 * Recursively generate expansion map based by checking if the children of the current path should expand based on the given expansion path.
 *
 * @param expansionPath - The path based on which expansion happens.
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
  } else if (path && path.length > 1 && equalThoughtRanked(path[0], HOME_PATH[0])) {
    // log error instead of throwing since it can cause the pullQueue to enter an infinite loop
    console.error(new Error('expandThoughtsRecursive: Invalid Path; Non-root Paths should omit ' + HOME_TOKEN))
    return {}
  }

  const simplePath = !path || path.length === 0 ? HOME_PATH : simplifyPath(state, path)

  /** Returns true if the child should be pinned open. */
  const isPinned = (child: Child | ThoughtContext) => {
    const context = pathToContext(getChildPath(state, child, simplePath))
    return attribute(state, context, '=pin')
  }

  const simpleContext = pathToContext(simplePath)
  const context = pathToContext(path)

  const rootedPath = path || HOME_PATH
  const showContexts = isContextViewActive(state, simpleContext)

  const childrenUnfiltered = showContexts
    ? getContexts(state, headValue(simplePath))
    : (getAllChildren(state, simpleContext) as (Child | ThoughtContext)[])

  const expansionBasePathContext = unroot(pathToContext(expansionBasePath))

  // Note: A path that is ancestor of the expansion path or expansion path itself should always be expanded.
  const visibleChildren = state.showHiddenThoughts
    ? childrenUnfiltered
    : childrenUnfiltered.filter(child => {
        const valueRaw = childValue(child, showContexts)
        if (valueRaw == null) {
          console.error('Invalid child', child)
          console.error('Children', childrenUnfiltered)
        }

        const value = strip(valueRaw)

        const childContext = unroot([...context, value])

        /** Check of the path is the ancestor of the expansion path. */
        const isAncestor = () => isDescendant(childContext, expansionBasePathContext)

        /** Check if the path is equal to the expansion path. */
        const isExpansionBasePath = () => equalArrays(childContext, expansionBasePathContext)

        return !isFunction(value) || isExpansionBasePath() || isAncestor()
      })

  // expand if child is only child and its child is not url
  const firstChild = visibleChildren[0] as Child
  const grandchildren =
    visibleChildren.length === 1 && firstChild.value != null && isPinned(firstChild) !== 'false'
      ? getAllChildren(state, unroot([...simpleContext, firstChild.value]))
      : null

  const isOnlyChildNoUrl =
    grandchildren &&
    !isTableColumn1(state, simpleContext) &&
    (grandchildren.length !== 1 || !isURL(childValue(grandchildren[0], showContexts)))

  const childrenPinned =
    isOnlyChildNoUrl ||
    isTable(state, simpleContext) ||
    pinChildren(state, simpleContext) ||
    publishPinChildren(state, simpleContext)
      ? visibleChildren
      : visibleChildren.filter(child => {
          const value = childValue(child, showContexts)

          const childNew = { ...child, value, id: createId() }
          const childPath = path ? appendToPath(path, childNew) : ([childNew] as Path)

          const childContext = unroot(pathToContext(childPath))

          /** Check of the path is the ancestor of the expansion path. */
          const isAncestor = () => isDescendant(childContext, expansionBasePathContext)

          /** Check if the path is equal to the expansion path. */
          const isExpansionBasePath = () => equalArrays(childContext, expansionBasePathContext)

          const isChildPinned = isPinned(child) === 'true'

          /**
            Only meta thoughts that are ancestor of expansionBasePath or expansionBasePath itself are visible when shouldHiddenThoughts is false. They are also automatically expanded.
            If state.showHiddenThoughts is false then for calculating visibleChildren those conditions are always checked for meta child.
            So this predicate prevents from recalculating isAncestor or isexpansionBasePath again by checking if those calculations are already done in visibleChildren logic.
           */
          const isEitherMetaAncestorOrCursor = () => !state.showHiddenThoughts && isFunction(value)

          const strippedValue = strip(value)

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
    [headId(rootedPath)]: returnContexts ? simpleContext : rootedPath,
  }

  return keyValueBy(
    childrenPinned,
    childOrContext => {
      const newPath = unroot([
        ...(path || []),
        (childOrContext as Child).value != null
          ? (childOrContext as Child)
          : { ...childOrContext, value: head((childOrContext as ThoughtContext).context) },
      ])
      // RECURSIVE
      // passing contextChain here creates an infinite loop
      return expandThoughtsRecursive(state, expansionBasePath, newPath, { returnContexts })
    },
    initialExpanded,
  )
}

export default expandThoughts
