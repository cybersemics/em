// util
import {
  head,
  hashThought,
  headValue,
  rankThoughtsFirstMatch,
  unroot,
} from '../util'

// selectors
import getThoughts from '../selectors/getThoughts'

/** Because the current thought only needs to hash match another thought
    we need to use the exact value of the child from the other context
    child.context SHOULD always be defined when showContexts is true . **/
export const getChildPath = (child, thoughtsRanked, showContexts) => {
  const value = showContexts ? head(child.context) : child.value

  const otherSubthought = (showContexts && child.context ? getThoughts(child.context) : [])
    .find(() => hashThought(value) === hashThought(headValue(thoughtsRanked)))
    || head(thoughtsRanked)

  const childPath = showContexts
    ? rankThoughtsFirstMatch(child.context).concat(otherSubthought)
    : unroot(thoughtsRanked).concat(child)

  return childPath
}
