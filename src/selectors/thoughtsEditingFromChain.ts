import Path from '../@types/Path'
import State from '../@types/State'
import { HOME_PATH } from '../constants'
import splitChain from '../selectors/splitChain'
import appendToPath from '../util/appendToPath'
import head from '../util/head'

/** Gets the ranked thoughts that are being edited from a context chain. */
const thoughtsEditingFromChain = (state: State, path: Path): Path => {
  const contextChain = splitChain(state, path)

  // the last context in the context chain, which is the context of the thought being edited
  const contextFromChain: Path = contextChain ? contextChain[contextChain.length - 1] : HOME_PATH

  // the penultimate context in the context chain, which is the thoughts that is being edited in the context view
  const thoughtsEditing = contextChain && contextChain.length > 1 ? contextChain[contextChain.length - 2] : HOME_PATH

  return appendToPath(contextFromChain, head(thoughtsEditing))
}

export default thoughtsEditingFromChain
