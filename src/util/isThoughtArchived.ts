import Path from '../@types/Path'
import State from '../@types/State'
import childIdsToThoughts from '../selectors/childIdsToThoughts'
import equalThoughtValue from '../util/equalThoughtValue'

/** Determines whether a thought is archived or not. */
const isThoughtArchived = (state: State, path: Path) => {
  const thoughtsArray = childIdsToThoughts(state, path)
  return thoughtsArray.some(equalThoughtValue('=archive'))
}

export default isThoughtArchived
