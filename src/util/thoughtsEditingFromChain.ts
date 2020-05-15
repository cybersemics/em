//@ts-nocheck

import {
  RANKED_ROOT,
} from '../constants'
import { store } from '../store'

// util
import { head } from './head'

// selectors
import { splitChain } from '../selectors'

/** Gets the ranked thoughts that are being edited from a context chain. */
export const thoughtsEditingFromChain = (path, contextViews) => {

  const contextChain = splitChain(store.getState(), path)

  // the last context in the context chain, which is the context of the thought being edited
  const contextFromChain = contextChain && contextChain[contextChain.length - 1]

  // the penultimate context in the context chain, which is the thoughts that is being edited in the context view
  const thoughtsEditing = contextChain && contextChain.length > 1
    ? contextChain[contextChain.length - 2]
    : RANKED_ROOT

  return contextFromChain.concat(head(thoughtsEditing))
}
