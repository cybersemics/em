import { store } from '../store.js'

// util
import { head } from './head.js'
import { splice } from './splice.js'
import { headValue } from './headValue.js'
import { contextOf } from './contextOf.js'
import { rankThoughtsFirstMatch } from './rankThoughtsFirstMatch.js'
import { getThought } from './getThought.js'

/** Generates thoughtsRanked from the last segment of a context chain */
export const lastThoughtsFromContextChain = (contextChain, state = store.getState().present) => {
  if (contextChain.length === 1) return contextChain[0]
  const penult = contextChain[contextChain.length - 2]
  const thought = getThought(headValue(penult), state.thoughtIndex)
  const ult = contextChain[contextChain.length - 1]
  const parent = thought.contexts.find(parent => head(parent.context) === ult[0].value)
  const thoughtsRankedPrepend = contextOf(rankThoughtsFirstMatch(parent.context, { state }))
  return thoughtsRankedPrepend.concat(splice(ult, 1, 0, head(penult)))
}
