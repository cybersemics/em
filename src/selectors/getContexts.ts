import getLexeme from '../selectors/getLexeme'
import isDivider from '../util/isDivider'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'

// static empty array reference
const NO_CONTEXTS = [] as ThoughtId[]

/** Returns a list of contexts that the given thought is a member of. */
const getContexts = (state: State, value: string) =>
  isDivider(value) ? NO_CONTEXTS : (getLexeme(state, value) || {}).contexts || NO_CONTEXTS

export default getContexts
