// util
import {
  getThoughts,
  head,
  pathToContext,
  rankThoughtsFirstMatch,
} from '../util'

export default (context, key) => (dispatch, getState) => {

  if (context) {
    const thoughtsRanked = rankThoughtsFirstMatch(context.concat(key))
    const hasAttribute = pathToContext(getThoughts(context)).includes(key)

    if (hasAttribute) {
      dispatch({
        type: 'existingThoughtDelete',
        context,
        thoughtRanked: head(thoughtsRanked)
      })
    }
  }

  return !!context
}
