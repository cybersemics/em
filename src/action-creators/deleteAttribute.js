// util
import {
  head,
  pathToContext,
  rankThoughtsFirstMatch,
} from '../util'

// selectors
import getThoughts from '../selectors/getThoughts'

export default (context, key) => (dispatch, getState) => {

  if (context) {
    const thoughtsRanked = rankThoughtsFirstMatch(context.concat(key))
    const hasAttribute = pathToContext(getThoughts(getState(), context)).includes(key)

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
