import {
  RANKED_ROOT,
} from '../constants.js'

// util
import { head } from './head.js'
import { splitChain } from './splitChain.js'

/** Gets the ranked items that are being edited from a context chain. */
export const itemsEditingFromChain = (path, contextViews) => {

  const contextChain = splitChain(path, contextViews)

  // the last context in the context chain, which is the context of the item being edited
  const contextFromChain = contextChain && contextChain[contextChain.length - 1]

  // the penultimate context in the context chain, which is the items that is being edited in the context view
  const itemsEditing = contextChain && contextChain.length > 1
    ? contextChain[contextChain.length - 2]
    : RANKED_ROOT

  return contextFromChain.concat(head(itemsEditing))
}
