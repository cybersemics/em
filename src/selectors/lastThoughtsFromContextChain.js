// util
import { contextOf, head, headValue, splice } from '../util'

// selectors
import { getThought, rankThoughtsFirstMatch } from '../selectors'

/** Generates thoughtsRanked from the last segment of a context chain */
export default (state, contextChain) => {
  if (contextChain.length === 1) return contextChain[0]
  const penult = contextChain[contextChain.length - 2]
  const thought = getThought(state, headValue(penult))
  const ult = contextChain[contextChain.length - 1]
  const parent = thought.contexts.find(parent => head(parent.context) === ult[0].value)
  const thoughtsRankedPrepend = contextOf(rankThoughtsFirstMatch(state, parent.context))
  return thoughtsRankedPrepend.concat(splice(ult, 1, 0, head(penult)))
}
