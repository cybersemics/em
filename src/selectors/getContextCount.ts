import type State from '../@types/State'
import isDivider from '../util/isDivider'
import getLexeme from './getLexeme'

/** Counts known and unloaded occurrences, including optimistic changes to the loaded IDs. */
const getContextCount = (state: State, value: string) => {
  const lexeme = getLexeme(state, value)
  return lexeme && !isDivider(value) ? lexeme.contexts.length + (lexeme.unloadedCount ?? 0) : 0
}

export default getContextCount
