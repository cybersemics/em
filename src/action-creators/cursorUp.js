import { store } from '../store.js'

// constants
import {
  RANKED_ROOT,
} from '../constants.js'

// util
import {
  contextOf,
  head,
  headValue,
  isDivider,
  prevSibling,
  unroot,
} from '../util.js'

export const cursorUp = ({ target }) => dispatch => {
  const { cursor } = store.getState()
  const thoughtsRanked = cursor || RANKED_ROOT
  const { value, rank } = head(thoughtsRanked)
  const context = contextOf(thoughtsRanked)

  const thoughtBefore = prevSibling(value, context, rank)
  const thoughtsRankedBefore = unroot(contextOf(thoughtsRanked).concat(thoughtBefore))
  // const prevNieces = thoughtBefore && getThoughtsRanked(thoughtsRankedBefore)
  // const prevNiece = prevNieces && prevNieces[prevNieces.length - 1]

  // TODO: Select deepest previous sibling's descendant (not just previous niece)

  const prevThoughtsRanked =
    // select prev sibling
    thoughtBefore ? thoughtsRankedBefore
      // select parent
      : context.length > 0 ? context
        // previous niece
        // prevNiece ? unroot(thoughtsRankedBefore.concat(prevNiece))
        : null // see TODO

  if (prevThoughtsRanked) {
    dispatch({ type: 'setCursor', thoughtsRanked: prevThoughtsRanked })

    // if we are selecting a divider, remove browser selection from the previous thought
    if (isDivider(headValue(prevThoughtsRanked))) {
      document.getSelection().removeAllRanges()
    }
  }
}
