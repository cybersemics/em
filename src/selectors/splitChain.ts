import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import getContexts from '../selectors/getContexts'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import headValue from '../util/headValue'

/**
 * Splits a Path into a context chain that contains each of its SimplePaths. For eample, if the Path crosses two context views A and B, the context chain will have length SimplePaths: [ROOT, ...] -> [A, ...] -> [B, ...].
 */
const splitChain = (state: State, path: Path): SimplePath[] => {
  const contextChain: SimplePath[] = []

  // Iterate through path. Whenever a context view is crossed, add the current SimplePath to the contextChain and advance indexSimplePathStart to the starting index of the next SimplePath in the chain.
  let indexSimplePathStart = 0
  path.forEach((id, i) => {
    const ancestor = path.slice(0, i + 1) as Path
    const contextId = path[i + 1]
    const value = headValue(state, ancestor)
    // An active context view is only crossed if the next id is one of the contexts, i.e. the parent of another instance of the thought. Otherwise the next id is an ordinary child and the path is simple, as with the SimplePath a/m/x of a thought rendered at a/m~/a/x.
    const crossesContextView =
      contextId !== undefined &&
      value !== undefined &&
      isContextViewActive(state, ancestor) &&
      getContexts(state, value).some(cxid => getThoughtById(state, cxid)?.parentId === contextId)
    if (crossesContextView) {
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
