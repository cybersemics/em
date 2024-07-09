import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import thoughtToPath from '../selectors/thoughtToPath'
import hashPath from '../util/hashPath'

/** Returns true if a thought is expanded. O(depth) because expanded is keyed by Path. */
const isThoughtExpanded = (state: State, thoughtId: ThoughtId) =>
  !!state.expanded[hashPath(thoughtToPath(state, thoughtId))]

export default isThoughtExpanded
