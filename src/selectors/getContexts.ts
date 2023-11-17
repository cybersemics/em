import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import getLexeme from '../selectors/getLexeme'
import isDivider from '../util/isDivider'

// static empty array reference
const NO_CONTEXTS: ThoughtId[] = []

/** Returns a list of contexts that the given thought is a member of. Returns a stable object reference if contexts are unchanged. */
const getContexts = (state: State, value: string) =>
  isDivider(value) ? NO_CONTEXTS : (getLexeme(state, value) || {}).contexts || NO_CONTEXTS

export default getContexts
