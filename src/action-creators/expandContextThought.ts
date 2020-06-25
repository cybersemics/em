import { ActionCreator, Path } from '../types'

/** Expands the inline breadcrumbs of a context in the context view. */
const expandContextThoughts = (thoughtsRanked: Path): ActionCreator => (dispatch, getState) => {
  if (thoughtsRanked || getState().expandedContextThought) {
    dispatch({
      type: 'expandContextThought',
      thoughtsRanked
    })
  }
}

export default expandContextThoughts
