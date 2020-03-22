import { store } from '../store.js'

// constants
import {
  RANKED_ROOT,
} from '../constants.js'

// util
import {
  contextOf,
  getThoughtsRanked,
  head,
  headValue,
  isDivider,
  nextSibling,
  perma,
  selectNextEditable,
  unroot,
} from '../util.js'

export const cursorDown = ({ target }) => dispatch => {
  const { cursor } = store.getState()
  const thoughtsRanked = cursor || RANKED_ROOT
  const { value, rank } = head(thoughtsRanked)
  const context = contextOf(thoughtsRanked)

  const firstChild = getThoughtsRanked(thoughtsRanked)[0]
  const thoughtAfter = perma(() => nextSibling(value, context, rank))

  // TODO: Select previous uncle, great uncle, great great uncle, etc (recursive) next sibling
  // instead of selectNextEditable which uses the DOM
  // const nextUncle = perma(() => thoughtsRanked.length > 1 && nextSibling(headValue(context), contextOf(context), headRank(context)))

  const nextThoughtsRanked =
    // select first child
    firstChild ? unroot(thoughtsRanked.concat(firstChild))
      // select next sibling
      : thoughtAfter() ? unroot(contextOf(thoughtsRanked).concat(thoughtAfter()))
        // select next uncle
        // : nextUncle() ? unroot(contextOf(contextOf(thoughtsRanked)).concat(nextUncle()))
        // select next editable in DOM (See TODO)
        : selectNextEditable(target)

  if (nextThoughtsRanked) {
    dispatch({ type: 'setCursor', thoughtsRanked: nextThoughtsRanked })

    // if we are selecting a divider, remove browser selection from the previous thought
    if (isDivider(headValue(nextThoughtsRanked))) {
      document.getSelection().removeAllRanges()
    }
  }
}
