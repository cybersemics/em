import _ from 'lodash'
import Path from '../@types/Path'
import State from '../@types/State'
import equalPath from '../util/equalPath'

/** Sets the expanded context thought if it matches the given path. */
const expandContextThought = (state: State, { path }: { path: Path }): State => ({
  ...state,
  expandedContextThought: equalPath(path, state.expandedContextThought) ? undefined : path,
})

export default _.curryRight(expandContextThought)
