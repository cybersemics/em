import { contextToThought } from '../selectors'
import { Context, State } from '../@types'

/** Returns true if the context has not been loaded form the remote yet. */
const isPending = (state: State, context: Context) => !!contextToThought(state, context)?.pending

export default isPending
