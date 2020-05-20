// util
import {
  getPrevRank,
} from '../util'

/** Creates a new attribute at the top of the given context. */
export default (context, key) => (dispatch, getState) => {

  if (context) {
    dispatch({
      type: 'newThoughtSubmit',
      context,
      value: key,
      rank: getPrevRank(context),
    })
  }

  return !!context
}
