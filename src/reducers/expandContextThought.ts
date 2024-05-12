import _ from 'lodash'
import Path from '../@types/Path'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import equalPath from '../util/equalPath'

/** Sets the expanded context thought if it matches the given path. */
const expandContextThought = (state: State, { path }: { path: Path }): State => ({
  ...state,
  expandedContextThought: equalPath(path, state.expandedContextThought) ? undefined : path,
})

/** Expands the inline breadcrumbs of a context in the context view. */
export const expandContextThoughtActionCreator =
  (path?: Path | null): Thunk =>
  (dispatch, getState) => {
    if (path || getState().expandedContextThought) {
      dispatch({
        type: 'expandContextThought',
        path,
      })
    }
  }

export default _.curryRight(expandContextThought)
