import { getLexeme } from '../selectors'
import { isDivider } from '../util'
import { State } from '../types'

/** Returns a list of contexts that the given thought is a member of. */
const getContexts = (state: State, value: string) =>
  isDivider(value) ? [] : (getLexeme(state, value) || {}).contexts || []

export default getContexts
