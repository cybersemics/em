import { store } from '../store.js'

// util
import { signifier } from './signifier.js'
import { splice } from './splice.js'
import { sigKey } from './sigKey.js'
import { intersections } from './intersections.js'
import { rankItemsFirstMatch } from './rankItemsFirstMatch.js'
import { getThought } from './getThought.js'

/** Generates itemsRanked from the last segment of a context chain */
export const lastItemsFromContextChain = (contextChain, state = store.getState()) => {
  if (contextChain.length === 1) return contextChain[0]
  const penult = contextChain[contextChain.length - 2]
  const item = getThought(sigKey(penult), state.data)
  const ult = contextChain[contextChain.length - 1]
  const parent = item.memberOf.find(parent => signifier(parent.context) === ult[0].key)
  const itemsRankedPrepend = intersections(rankItemsFirstMatch(parent.context, { state }))
  return itemsRankedPrepend.concat(splice(ult, 1, 0, signifier(penult)))
}
