import { getThought, rankThoughtsFirstMatch } from '../selectors'
import { contextOf, head, headValue, splice } from '../util'
import { State } from '../util/initialState'
import { Child, ThoughtContext } from '../types'

/** Generates thoughtsRanked from the last segment of a context chain. */
const lastThoughtsFromContextChain = (state: State, contextChain: Child[][]) => {
  if (contextChain.length === 1) return contextChain[0]
  const penult = contextChain[contextChain.length - 2]
  const thought = getThought(state, headValue(penult))
  const ult = contextChain[contextChain.length - 1]
  const parent = thought.contexts.find(parent => head(parent.context) === ult[0].value) as ThoughtContext
  const thoughtsRankedPrepend = contextOf(rankThoughtsFirstMatch(state, parent?.context))
  // @ts-ignore
  return thoughtsRankedPrepend.concat(splice(ult, 1, 0, head(penult)))
}

export default lastThoughtsFromContextChain
