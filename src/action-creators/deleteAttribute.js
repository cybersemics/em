// util
import {
  head,
  pathToContext,
} from '../util'

// selectors
import { rankThoughtsFirstMatch } from '../selectors'
import getThoughts from '../selectors/getThoughts'

export default (context, key) => (dispatch, getState) => {
  const state = getState()
  if (context) {
    const thoughtsRanked = rankThoughtsFirstMatch(state, context.concat(key))
    const hasAttribute = pathToContext(getThoughts(state, context)).includes(key)

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
