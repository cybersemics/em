import { RANKED_ROOT } from '../constants'
import { setCursor } from '../reducers'
import { prevSibling } from '../selectors'
import { parentOf, head, isRoot, pathToContext, rootedParentOf, unroot } from '../util'
import { State } from '../util/initialState'

/** Moves the cursor to the previous sibling. */
const cursorUp = (state: State) => {
  const { cursor } = state
  const path = cursor || RANKED_ROOT
  const { value, rank } = head(path)
  const contextRanked = rootedParentOf(path)
  const context = pathToContext(contextRanked)

  const thoughtBefore = prevSibling(state, value, context, rank)
  const pathBefore = thoughtBefore && unroot(parentOf(path).concat(thoughtBefore))
  // const prevNieces = thoughtBefore && getChildrenRanked(pathBefore)
  // const prevNiece = prevNieces && prevNieces[prevNieces.length - 1]

  // TODO: Select deepest previous sibling's descendant (not just previous niece)

  const prevThoughtsRanked =
    // select prev sibling
    thoughtBefore ? pathBefore
    // select parent
    : !isRoot(context) ? contextRanked
    // previous niece
    // prevNiece ? unroot(pathBefore.concat(prevNiece))
    : null // see TODO

  return prevThoughtsRanked
    ? setCursor(state, { path: prevThoughtsRanked })
    : state
}

export default cursorUp
