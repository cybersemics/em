import globals from '../globals'
import { EXPAND_THOUGHT_CHAR, MAX_EXPAND_DEPTH, RANKED_ROOT, ROOT_TOKEN } from '../constants'
import { attributeEquals, getChildPath, getContexts, getAllChildren, isContextViewActive, simplifyPath } from '../selectors'
import { Child, Context, Index, Path, ThoughtContext } from '../types'
import { State } from '../util/initialState'
import { hashContext, head, headValue, isFunction, isURL, parentOf, pathToContext, publishMode, rootedParentOf, unroot } from '../util'

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
const expandThoughts = (state: State, path: Path | null, { depth = 0 }: { depth?: number } = {}): Index<boolean> => {

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
  const rootedContext = path && path.length > 0 ? pathToContext(path) : [ROOT_TOKEN]
  const showContexts = isContextViewActive(state, context)

  /** Get the value of the Child | ThoughtContext. */
  const childValue = (child: Child | ThoughtContext) => showContexts
    ? head((child as ThoughtContext).context)
    : (child as Child).value

  const childrenUnfiltered = showContexts
    ? getContexts(state, headValue(simplePath))
    : getAllChildren(state, pathToContext(simplePath)) as (Child | ThoughtContext)[]
  const children = state.showHiddenThoughts
    ? childrenUnfiltered
    : childrenUnfiltered.filter(child => !isFunction(childValue(child)))

  // expand if child is only child and its child is not url
  const grandchildren = children.length === 1
    ? getAllChildren(state, pathToContext((path || []).concat(children[0] as Child)))
    : null

  /** Returns true if the context is the first column in a table view. */
  const isTableColumn1 = () => attributeEquals(
    state,
    parentOf(context),
    '=view',
    'Table'
  )

  const isOnlyChildNoUrl = grandchildren &&
    !isTableColumn1() &&
    (grandchildren.length !== 1 || !isURL(childValue(grandchildren[0])))

  /** Returns true if the context is in table view. */
  const isTable = () => attributeEquals(state, context, '=view', 'Table')

  /** Returns true if all children of the context should be pinned open. */
  const pinChildren = () => attributeEquals(state, context, '=pinChildren', 'true')

  /**
   * Check for =publish/=attributes/pinChildren in publish mode.
   * Note: Use 'pinChildren' so it is not interpreted in editing mode.
   */
  const publishPinChildren = () => publishMode() && attributeEquals(
    state,
    unroot(context.concat(['=publish', '=attributes'])) as Context,
    'pinChildren',
    'true'
  )

  return (isOnlyChildNoUrl || isTable() || pinChildren() || publishPinChildren()
    ? children
    : children.filter(child => {
      /** Returns true if the child should be pinned open. */
      const isPinned = () => attributeEquals(state, pathToContext(getChildPath(state, child, simplePath)), '=pin', 'true')
      const value = childValue(child)
      return value[value.length - 1] === EXPAND_THOUGHT_CHAR || isPinned()
    })
  ).reduce(
    (accum: Index<boolean>, childOrContext) => {
      const newPath = [
        ...path || [],
        (childOrContext as Child).value != null
          ? childOrContext as Child
          : { ...childOrContext, value: head((childOrContext as ThoughtContext).context) }
      ]
      return {
        ...accum,
        // RECURSION
        ...expandThoughts(state, newPath, { depth: depth + 1 })
      }
    },
    {
      // expand current thought
      [hashContext(rootedContext)]: true,

      // expand context
      // this allows expansion of column 1 when the cursor is on column 2 in the table view, and uncles of the cursor that end in ":"
      // RECURSION
      ...path && path.length >= 1 && depth <= 1
        ? expandThoughts(state, rootedParentOf(path), { depth: depth + 1 })
        : {}
    }
  )
}

export default expandThoughts
