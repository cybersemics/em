import _ from 'lodash'
import { equalPath } from '../util'
import { State } from '../util/initialState'
import { Path } from '../types'

/** Sets the expanded context thought if it matches the given path. */
const expandContextThought = (state: State, { path }: { path: Path }): State => ({
  ...state,
  expandedContextThought: equalPath(path, state.expandedContextThought || [])
    ? undefined
    : path
})

export default _.curryRight(expandContextThought)
