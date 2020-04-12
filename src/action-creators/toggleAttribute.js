// util
import {
  head,
  pathToContext,
} from '../util'

// selectors
import { getPrevRank, rankThoughtsFirstMatch } from '../selectors'
import getThoughts from '../selectors/getThoughts'
import attribute from '../selectors/attribute'

export default (context, key, value) => (dispatch, getState) => {

  if (context) {
    const state = getState()
    const thoughtsRanked = rankThoughtsFirstMatch(state, context.concat(key))
    const hasAttribute = pathToContext(getThoughts(state, context)).includes(key)

    if (hasAttribute && attribute(state, context, key) === value) {
      dispatch({
        type: 'existingThoughtDelete',
        context,
        thoughtRanked: head(thoughtsRanked)
      })
    }
    else {
      // create attribute if it does not exist
      if (!hasAttribute) {
        dispatch({
          type: 'newThoughtSubmit',
          context,
          value: key,
          rank: getPrevRank(state, context),
        })
      }

      dispatch({
        type: 'setFirstSubthought',
        context: context.concat(key),
        value,
      })
    }
  }

  return !!context
}
