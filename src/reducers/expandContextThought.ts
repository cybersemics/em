import { equalPath } from '../util'
import { State } from '../util/initialState'
import { Path } from '../types'

/** Sets the expanded context thought if it matches the given path. */
const expandContextThought = (state: State, { thoughtsRanked }: { thoughtsRanked: Path }) => ({
  ...state,
  expandedContextThought: equalPath(state.expandedContextThought || [], thoughtsRanked)
    ? null
    : thoughtsRanked
})

export default expandContextThought
