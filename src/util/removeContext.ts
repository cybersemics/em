import { timestamp } from './timestamp'
import { notNull } from './notNull'
import { State, Lexeme, Timestamp } from '../@types'

// @MIGRATION_TODO: Use id to remove instead of context
/** Returns a new thought less the given context. */
export const removeContext = (
  state: State,
  lexeme: Lexeme,
  thoughtId: string,
  lastUpdated: Timestamp = timestamp(),
): Lexeme => {
  return Object.assign(
    {},
    lexeme,
    notNull({
      contexts: lexeme.contexts ? lexeme.contexts.filter(id => id !== thoughtId) : [],
      created: lexeme.created || lastUpdated,
      lastUpdated: lastUpdated,
    }),
  )
}
