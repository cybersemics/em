import { ActionCreator, Path } from '../types'

/** Expands the inline breadcrumbs of a context in the context view. */
const expandContextThought = (path?: Path | null): ActionCreator => (dispatch, getState) => {
  if (path || getState().expandedContextThought) {
    dispatch({
      type: 'expandContextThought',
      path
    })
  }
}

export default expandContextThought
