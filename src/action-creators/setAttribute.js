// util
import {
  getPrevRank,
  pathToContext,
} from '../util'

// selectors
import getThoughts from '../selectors/getThoughts'

export default (context, key, value) => (dispatch, getState) => {

  // create attribute if it does not exist
  if (!pathToContext(getThoughts(getState, context)).includes(key)) {
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
