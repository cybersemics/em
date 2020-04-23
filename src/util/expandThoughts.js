import globals from '../globals'

// constants
import {
  EXPAND_THOUGHT_CHAR,
  MAX_EXPAND_DEPTH,
  RANKED_ROOT,
} from '../constants'

// util
import {
  contextChainToPath,
  contextOf,
  equalPath,
  excludeMetaThoughts,
  getChildPath,
  getThoughtsRanked,
  hashContext,
  isDescendant,
  isURL,
  pathToContext,
  publishMode,
  unroot,
} from '../util'

// selectors
import attributeEquals from '../selectors/attributeEquals'

/** Returns an expansion map marking all contexts that should be expanded
  * @example {
    [hashContext(context)]: true,
    [hashContext(context.concat(childA))]: true,
    [hashContext(context.concat(childB))]: true,
    [hashContext(context.concat(childC))]: true,
    ...
  }
*/
const expandThoughtsRecursion = (path, thoughtIndex, contextIndex, contextViews = {}, contextChain = [], cursor, { depth } = {}) => {

  if (
    // arbitrarily limit depth to prevent infinite context view expansion (i.e. cycles)
    depth > MAX_EXPAND_DEPTH ||
    // suppress expansion if left command is held down after cursorDown
    globals.suppressExpansion
  ) return {}

  const thoughtsRanked = !path || path.length === 0 ? RANKED_ROOT
    : contextChain.length > 0 ? contextChainToPath(contextChain)
    : path

  const children = excludeMetaThoughts(getThoughtsRanked(thoughtsRanked, thoughtIndex, contextIndex))

  // expand if child is only child and its child is not url
  const subChildren = children.length === 1
    ? getThoughtsRanked((path || []).concat(children[0]), thoughtIndex, contextIndex)
    : null

  const isTableColumn1 = () => attributeEquals(
    { contextIndex, thoughtIndex },
    contextOf(pathToContext(thoughtsRanked)),
    '=view',
    'Table'
  )

  const isOnlyChildNoUrl = subChildren &&
    !isTableColumn1() &&
    (subChildren.length !== 1 || !isURL(subChildren[0].value))

  const isTable = () => attributeEquals({ thoughtIndex, contextIndex }, pathToContext(thoughtsRanked), '=view', 'Table')
  const pinChildren = () => attributeEquals({ thoughtIndex, contextIndex }, pathToContext(thoughtsRanked), '=pinChildren', 'true')

  /** check for =publish/=attributes/pinChildren in publish mode
      Note: Use 'pinChildren' so it is not interpreted in editing mode
  */
  const publishPinChildren = publishMode() && attributeEquals(
    { thoughtIndex, contextIndex },
    unroot(pathToContext(thoughtsRanked).concat(['=publish', '=attributes'])),
    'pinChildren',
    'true'
  )

  return (isOnlyChildNoUrl || isTable() || pinChildren() || publishPinChildren
    ? children
    : children.filter(child => {
      const childPath = (path || []).concat(child)
      const isCursor = equalPath(childPath, cursor)
      const isDirectAncestorOfCursor = isDescendant(childPath, cursor)
      const isPinned = attributeEquals({ thoughtIndex, contextIndex }, getChildPath(child, thoughtsRanked), '=pin', 'true')
      return child.value[child.value.length - 1] === EXPAND_THOUGHT_CHAR || isPinned || isCursor || isDirectAncestorOfCursor
    })
  ).reduce(
    (accum, child) => {

      const newContextChain = (contextChain || [])
        .map(thoughts => thoughts.concat())
        .concat(contextChain.length > 0 ? [[child]] : [])

      return Object.assign({}, accum,
        // RECURSIVE
        // passing contextChain here creates an infinite loop
        expandThoughtsRecursion((path || []).concat(child), thoughtIndex, contextIndex, contextViews, newContextChain, cursor, { depth: depth + 1, print })
      )
    },
    {
      // expand current thought
      [hashContext(path || [])]: true
    }
  )
}

export const expandThoughts = (cursor, thoughtIndex, contextIndex, contextViews = {}, contextChain = [], { print = false } = {}) => {

  const startingPath = contextOf(contextOf(cursor || []))
  const startingDepth = startingPath.length - (cursor || []).length

  return expandThoughtsRecursion(startingPath, thoughtIndex, contextIndex, contextViews, contextChain, cursor || [], { print, depth: startingDepth })
}
