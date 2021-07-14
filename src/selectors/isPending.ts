import { Context, State } from '../@types'
import { getParent } from '../selectors'

/** Returns true if the context has not been loaded form the remote yet. */
const isPending = (state: State, context: Context) => !!getParent(state, context)?.pending

export default isPending
