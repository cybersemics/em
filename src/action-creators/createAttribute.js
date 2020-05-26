// selectors
import {
  getPrevRank,
} from '../selectors'

import {
  createUuid,
} from '../util'

/** Creates a new attribute at the top of the given context. */
export default (context, key) => (dispatch, getState) => {

  if (context) {
    dispatch({
      type: 'newThoughtSubmit',
      context,
      value: key,
      rank: getPrevRank(context),
      uuid: createUuid()
    })
  }

  return !!context
}
