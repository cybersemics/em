// util
import {
  attribute,
  getPrevRank,
  getThoughts,
  head,
  pathToContext,
  rankThoughtsFirstMatch,
} from '../util'

export default (context, key, value) => (dispatch, getState) => {

  if (context) {
    const thoughtsRanked = rankThoughtsFirstMatch(context.concat(key))
    const hasAttribute = pathToContext(getThoughts(context)).includes(key)

    if (hasAttribute && attribute(context, key) === value) {
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
