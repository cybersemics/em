// util
import {
  pathToContext,
} from '../util'

// selectors
import {
  getPrevRank,
  getThoughts,
} from '../selectors'

/** Sets an attribute on the given context. */
export default (context, key, value) => (dispatch, getState) => {

  const state = getState()

  // create attribute if it does not exist
  if (!pathToContext(getThoughts(state, context)).includes(key)) {
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
