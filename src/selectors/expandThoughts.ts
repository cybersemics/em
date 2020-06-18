import globals from '../globals'
import { EXPAND_THOUGHT_CHAR, MAX_EXPAND_DEPTH, RANKED_ROOT } from '../constants'
import { attributeEquals, expandThoughts, getChildPath, getContexts, getThoughts, isContextViewActive } from '../selectors'
import { Child, Context, Path } from '../types'
import { State } from '../util/initialState'
import { GenericObject, Nullable } from '../utilTypes'

// util
import {
  contextChainToPath,
  contextOf,
  hashContext,
  head,
  headValue,
  isFunction,
  isURL,
  pathToContext,
  publishMode,
  unroot,
} from '../util'

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
export default (state: State, path: Nullable<Path>, contextChain: Child[][] = [], { depth = 0 }: { depth?: number } = {}): GenericObject<boolean> => {

  if (
    // arbitrarily limit depth to prevent infinite context view expansion (i.e. cycles)
    depth > MAX_EXPAND_DEPTH ||
    // suppress expansion if left command is held down after cursorDown
    globals.suppressExpansion
  ) return {}

  /** Get the value of the Child | ThoughtContext. */
  const childValue = (child: any) => showContexts ? head(child.context) : child.value

  const thoughtsRanked = !path || path.length === 0 ? RANKED_ROOT
    : contextChain.length > 0 ? contextChainToPath(contextChain)
    : path
  const context = pathToContext(thoughtsRanked)
  const rootedPath = path && path.length > 0 ? path : RANKED_ROOT
  const showContexts = isContextViewActive(state, context)

  const childrenUnfiltered: any = showContexts
    ? getContexts(state, headValue(thoughtsRanked))
    : getThoughts(state, pathToContext(thoughtsRanked))
  const children = state.showHiddenThoughts
    ? childrenUnfiltered
    : childrenUnfiltered.filter((child: Child) => !isFunction(childValue(child)))
  const parentEntry = state.thoughts.contextIndex![hashContext(context)]

  // if the thought has no visible children, there is nothing to expand
  // except pending thoughts so they get picked up by the thoughtCacheMiddleware
  if (children.length === 0 && (!parentEntry || !parentEntry.pending)) return {}

  // expand if child is only child and its child is not url
  const grandchildren = children.length === 1
    ? getThoughts(state, pathToContext((path || []).concat(children[0])))
    : null

  /** Returns true if the context is the first column in a table view. */
  const isTableColumn1 = () => attributeEquals(
    state,
    contextOf(context),
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
    : children.filter((child: Child) => {
      /** Returns true if the child should be pinned open. */
      const isPinned = () => attributeEquals(state, pathToContext(getChildPath(state, child, thoughtsRanked)), '=pin', 'true')
      const value = childValue(child)
      return value[value.length - 1] === EXPAND_THOUGHT_CHAR || isPinned()
    })
  ).reduce(
    (accum: GenericObject<boolean>, child: Child) => {
      const newContextChain = (contextChain || [])
        .map((path: Path) => path.concat())
        .concat(contextChain.length > 0 ? [[child]] : [])

      return Object.assign({}, accum,
        // RECURSIVE
        // passing contextChain here creates an infinite loop
        expandThoughts(state, (path || []).concat(child), newContextChain, { depth: depth + 1 })
      )
    },
    {
      // expand current thought
      [hashContext(rootedPath)]: rootedPath,

      // expand context
      // this allows expansion of column 1 when the cursor is on column 2 in the table view, and uncles of the cursor that end in ":"
      // RECURSION
      ...path && path.length >= 1 && depth <= 1
        ? expandThoughts(state, contextOf(path), contextChain, { depth: depth + 1 })
        : {}
    }
  )
}
