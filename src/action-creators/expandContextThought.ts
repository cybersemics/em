import { ActionCreator, Path } from '../types'

/** Expands the inline breadcrumbs of a context in the context view. */
const expandContextThought = (thoughtsRanked?: Path | null): ActionCreator => (dispatch, getState) => {
  if (thoughtsRanked || getState().expandedContextThought) {
    dispatch({
      type: 'expandContextThought',
      thoughtsRanked
    })
  }
}

export default expandContextThought
