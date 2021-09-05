import { timestamp } from './timestamp'
import { notNull } from './notNull'
import { getSessionId } from './sessionManager'
import { State, Lexeme, Timestamp } from '../@types'

/** Returns a new Lexeme without the given context. */
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
      updatedBy: getSessionId(),
    }),
  )
}
