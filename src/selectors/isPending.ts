import { getThought } from '../selectors'
import { Context, State } from '../@types'

/** Returns true if the context has not been loaded form the remote yet. */
const isPending = (state: State, context: Context) => !!getThought(state, context)?.pending

export default isPending
