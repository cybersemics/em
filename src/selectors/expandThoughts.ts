import globals from '../globals'
import { EXPAND_THOUGHT_CHAR, MAX_EXPAND_DEPTH, RANKED_ROOT } from '../constants'
import { attributeEquals, getChildPath, getContexts, getAllChildren, isContextViewActive, simplifyPath } from '../selectors'
import { Child, Context, Index, Path, ThoughtContext } from '../types'
import { State } from '../util/initialState'
import { hashContext, head, headValue, isFunction, isURL, keyValueBy, parentOf, pathToContext, publishMode, rootedParentOf, unroot } from '../util'

/** Get the value of the Child | ThoughtContext. */
const childValue = (child: Child | ThoughtContext, showContexts: boolean) => showContexts
  ? head((child as ThoughtContext).context)
  : (child as Child).value

/** Returns true if the context is in table view. */
const isTable = (state: State, context: Context) =>
  attributeEquals(state, context, '=view', 'Table')

/** Returns true if all children of the context should be pinned open. */
const pinChildren = (state: State, context: Context) =>
  attributeEquals(state, context, '=pinChildren', 'true')

/** Returns true if the context is the first column in a table view. */
const isTableColumn1 = (state: State, context: Context) => attributeEquals(
  state,
  parentOf(context),
  '=view',
  'Table'
)

/**
 * Check for =publish/=attributes/pinChildren in publish mode.
 * Note: Use 'pinChildren' so it is not interpreted in editing mode.
 */
const publishPinChildren = (state: State, context: Context) => publishMode() && attributeEquals(
  state,
  unroot(context.concat(['=publish', '=attributes'])) as Context,
  'pinChildren',
  'true'
)

/** Returns an expansion map marking all contexts that should be expanded.
 *
 * @example {
 *   [hashContext(context)]: true,
 *   [hashContext(context.concat(childA))]: true,
 *   [hashContext(context.concat(childB))]: true,
 *   [hashContext(context.concat(childC))]: true,
 *   ...
 * }
 */
const expandThoughts = (state: State, path: Path | null, { depth = 0 }: { depth?: number } = {}): Index<Path> => {

  if (
    // arbitrarily limit depth to prevent infinite context view expansion (i.e. cycles)
    depth > MAX_EXPAND_DEPTH ||
    // suppress expansion if left command is held down after cursorDown
    globals.suppressExpansion
  ) return {}

  const simplePath = !path || path.length === 0
    ? RANKED_ROOT
    : simplifyPath(state, path)

  const context = pathToContext(simplePath)
  const rootedPath = path || RANKED_ROOT
  const showContexts = isContextViewActive(state, context)

  const childrenUnfiltered = showContexts
    ? getContexts(state, headValue(simplePath))
    : getAllChildren(state, context) as (Child | ThoughtContext)[]
  const children = state.showHiddenThoughts
    ? childrenUnfiltered
    : childrenUnfiltered.filter(child => !isFunction(childValue(child, showContexts)))

  // expand if child is only child and its child is not url
  const firstChild = children[0] as Child
  const grandchildren = children.length === 1 && firstChild.value != null
    ? getAllChildren(state, unroot([...context, firstChild.value]))
    : null

  const isOnlyChildNoUrl = grandchildren &&
    !isTableColumn1(state, context) &&
    (grandchildren.length !== 1 || !isURL(childValue(grandchildren[0], showContexts)))

  const childrenPinned = isOnlyChildNoUrl || isTable(state, context) || pinChildren(state, context) || publishPinChildren(state, context)
    ? children
    : children.filter(child => {
      /** Returns true if the child should be pinned open. */
      const isPinned = () => attributeEquals(state, pathToContext(getChildPath(state, child, simplePath)), '=pin', 'true')
      const value = childValue(child, showContexts)
      return value[value.length - 1] === EXPAND_THOUGHT_CHAR || isPinned()
    })

  const initialExpanded = {
    // expand current thought
    [hashContext(pathToContext(rootedPath))]: rootedPath,

    // expand context
    // this allows expansion of column 1 when the cursor is on column 2 in the table view, and uncles of the cursor that end in ":"
    // RECURSION
    ...path && path.length >= 1 && depth <= 1
      ? expandThoughts(state, rootedParentOf(path), { depth: depth + 1 })
      : {}
  }

  return keyValueBy(childrenPinned, childOrContext => {
    const newPath = [
      ...path || [],
      (childOrContext as Child).value != null
        ? childOrContext as Child
        : { ...childOrContext, value: head((childOrContext as ThoughtContext).context) }
    ]
    // RECURSIVE
    // passing contextChain here creates an infinite loop
    return expandThoughts(state, newPath, { depth: depth + 1 })
  }, initialExpanded)
}

export default expandThoughts
