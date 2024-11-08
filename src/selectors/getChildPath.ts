import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import ThoughtContext from '../@types/ThoughtContext'
import ThoughtId from '../@types/ThoughtId'
import appendToPath from '../util/appendToPath'
import thoughtToPath from './thoughtToPath'

/** Returns the SimplePath of a thought based on if it is in the context view. Does not return a stable object, and cannot be memoized trivially. See the explanation of childPathUnstable in Subthoughts.tsx. */
const getChildPath = (
  state: State,
  child: ThoughtId | ThoughtContext,
  simplePath: SimplePath,
  showContexts?: boolean,
): SimplePath => (showContexts ? thoughtToPath(state, child) : appendToPath(simplePath, child as ThoughtId))

export default getChildPath
