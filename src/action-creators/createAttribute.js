// util
import {
  getPrevRank,
} from '../util'

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
