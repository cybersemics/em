// util
import {
  getPrevRank,
  getThoughts,
  pathToContext,
} from '../util.js'

export default (context, key, value) => (dispatch, getState) => {

  // create attribute if it does not exist
  if (!pathToContext(getThoughts(context)).includes(key)) {
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
