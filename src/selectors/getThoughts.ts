import { Context } from '../types'
import { State } from '../util/initialState'
import { hashContext } from '../util'
import { getThoughtsOfEncodedContext } from '../selectors'

/** Returns the subthoughts of the given context unordered. If the subthoughts have not changed, returns the same object reference. */
const getThoughts = (state: State, context: Context) =>
  getThoughtsOfEncodedContext(state, hashContext(context))

export default getThoughts
