// util
import {
  attribute,
  getPrevRank,
  getThoughts,
  head,
  pathToContext,
  rankThoughtsFirstMatch,
} from '../util.js'

import newThoughtSubmit from './newThoughtSubmit'
import setFirstSubthought from './setFirstSubthought'

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
        dispatch(newThoughtSubmit({
          context,
          value: key,
          rank: getPrevRank(context),
        }))
      }

      dispatch(setFirstSubthought({
        context: context.concat(key),
        value,
      }))
    }
  }

  return !!context
}
