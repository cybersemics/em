import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import isContextViewActive from '../selectors/isContextViewActive'

/**
 * Splits a Path into a context chain that contains each of its SimplePaths. For eample, if the Path crosses two context views A and B, the context chain will have length SimplePaths: [ROOT, ...] -> [A, ...] -> [B, ...].
 */
const splitChain = (state: State, path: Path): SimplePath[] => {
  const contextChain: SimplePath[] = []

  // Iterate through path. Whenever a context view is found, add the current SimplePath to the contextChain and advance indexSimplePathStart to the starting index of the next SimplePath in the chain.
  let indexSimplePathStart = 0
  path.forEach((value, i) => {
    const ancestor = path.slice(0, i + 1) as Path
    const showContexts = isContextViewActive(state, ancestor)
    if (showContexts && i < path.length - 1) {
      contextChain.push(path.slice(indexSimplePathStart, i + 1) as SimplePath)
      indexSimplePathStart = i + 1
    }
  })

  // if no context views were encountered, path must be a SimplePath and we can return it as the sole context in the chain
  if (contextChain.length === 0) return [path as SimplePath]

  // Add the final SimplePath to the contextChain.
  // If no context views, are active, this will add the
  contextChain.push(path.slice(indexSimplePathStart, path.length) as SimplePath)

  return contextChain
}

export default splitChain
