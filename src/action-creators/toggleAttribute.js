// util
import {
  getPrevRank,
  getThoughts,
  head,
  pathToContext,
  rankThoughtsFirstMatch,
} from '../util'

// selectors
import attributeEquals from '../selectors/attributeEquals'

export default (context, key, value) => (dispatch, getState) => {

  if (context) {

    const state = getState()
    const thoughtsRanked = rankThoughtsFirstMatch(context.concat(key))

    if (attributeEquals(state, context, key, value)) {
      dispatch({
        type: 'existingThoughtDelete',
        context,
        thoughtRanked: head(thoughtsRanked)
      })
    }
    // create attribute if it does not exist
    else {
      const hasAttribute = pathToContext(getThoughts(context)).includes(key)
      if (!hasAttribute) {
        dispatch({
          type: 'newThoughtSubmit',
          context,
          value: key,
          rank: getPrevRank(context),
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
