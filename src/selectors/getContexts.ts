import { getThought } from '../selectors'
import { isDivider } from '../util'
import { State } from '../util/initialState'

/** Returns a list of contexts that the given thought is a member of. */
const getContexts = (state: State, value: string) =>
  isDivider(value)
    ? []
    : (getThought(state, value) || {}).contexts || []

export default getContexts
