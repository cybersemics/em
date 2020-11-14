import { getParent } from '../selectors'
import { Context } from '../types'
import { State } from '../util/initialState'

/** Returns true if the context has not been loaded form the remote yet. */
const isPending = (state: State, context: Context) =>
  !!getParent(state, context)?.pending

export default isPending
