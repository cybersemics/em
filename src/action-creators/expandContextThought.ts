import Path from '../@types/Path'
import Thunk from '../@types/Thunk'

/** Expands the inline breadcrumbs of a context in the context view. */
const expandContextThought =
  (path?: Path | null): Thunk =>
  (dispatch, getState) => {
    if (path || getState().expandedContextThought) {
      dispatch({
        type: 'expandContextThought',
        path,
      })
    }
  }

export default expandContextThought
