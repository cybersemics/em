// util
import {
  getPrevRank,
  getThoughts,
  pathToContext,
} from '../util.js'

// action-creators
import newThoughtSubmit from './newThoughtSubmit'
import setFirstSubthought from './setFirstSubthought'

export default (context, key, value) => dispatch => {

  // create attribute if it does not exist
  if (!pathToContext(getThoughts(context)).includes(key)) {
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
