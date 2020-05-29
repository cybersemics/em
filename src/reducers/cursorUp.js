// constants
import {
  RANKED_ROOT,
} from '../constants'

// util
import {
  contextOf,
  head,
  isRoot,
  pathToContext,
  rootedContextOf,
  unroot,
} from '../util'

// selectors
import { prevSibling } from '../selectors'

// reducers
import setCursor from './setCursor'

/** Moves the cursor to the previous sibling. */
export default state => {
  const { cursor } = state
  const thoughtsRanked = cursor || RANKED_ROOT
  const { value, rank } = head(thoughtsRanked)
  const contextRanked = rootedContextOf(thoughtsRanked)
  const context = pathToContext(contextRanked)

  const thoughtBefore = prevSibling(state, value, context, rank)
  const thoughtsRankedBefore = thoughtBefore && unroot(contextOf(thoughtsRanked).concat(thoughtBefore))
  // const prevNieces = thoughtBefore && getThoughtsRanked(thoughtsRankedBefore)
  // const prevNiece = prevNieces && prevNieces[prevNieces.length - 1]

  // TODO: Select deepest previous sibling's descendant (not just previous niece)

  const prevThoughtsRanked =
    // select prev sibling
    thoughtBefore ? thoughtsRankedBefore
    // select parent
    : !isRoot(context) ? contextRanked
    // previous niece
    // prevNiece ? unroot(thoughtsRankedBefore.concat(prevNiece))
    : null // see TODO

  return prevThoughtsRanked
    ? setCursor(state, { thoughtsRanked: prevThoughtsRanked })
    : state
}
