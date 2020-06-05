import { RANKED_ROOT } from '../constants'
import { splitChain } from '../selectors'
import { head } from '../util'
import { Path } from '../types'
import { State } from '../util/initialState'

/** Gets the ranked thoughts that are being edited from a context chain. */
const thoughtsEditingFromChain = (state: State, path: Path) => {

  const contextChain = splitChain(state, path)

  // the last context in the context chain, which is the context of the thought being edited
  const contextFromChain: Path = contextChain ? contextChain[contextChain.length - 1] : []

  // the penultimate context in the context chain, which is the thoughts that is being edited in the context view
  const thoughtsEditing = contextChain && contextChain.length > 1
    ? contextChain[contextChain.length - 2]
    : RANKED_ROOT

  return contextFromChain.concat(head(thoughtsEditing))
}

export default thoughtsEditingFromChain
