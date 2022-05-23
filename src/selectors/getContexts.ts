import { getLexeme } from '../selectors'
import { isDivider } from '../util'
import { State, ThoughtId } from '../@types'

// static empty array reference
const NO_CONTEXTS = [] as ThoughtId[]

/** Returns a list of contexts that the given thought is a member of. */
const getContexts = (state: State, value: string) =>
  isDivider(value) ? NO_CONTEXTS : (getLexeme(state, value) || {}).contexts || NO_CONTEXTS

export default getContexts
