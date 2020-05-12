// util
import {
  head,
  pathToContext,
} from '../util'

// selectors
import {
  attributeEquals,
  getPrevRank,
  getThoughts,
  rankThoughtsFirstMatch,
} from '../selectors'

// selectors

export default (context, key, value) => (dispatch, getState) => {

  if (!context) return false

  const state = getState()
  const thoughtsRanked = rankThoughtsFirstMatch(state, context.concat(key))

  if (attributeEquals(state, context, key, value)) {
    dispatch({
      type: 'existingThoughtDelete',
      context,
      thoughtRanked: head(thoughtsRanked)
    })
  }
  // create attribute if it does not exist
  else {
    const hasAttribute = pathToContext(getThoughts(state, context)).includes(key)
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

  return true
}
