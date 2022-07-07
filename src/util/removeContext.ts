import Lexeme from '../@types/Lexeme'
import State from '../@types/State'
import Timestamp from '../@types/Timestamp'
import notNull from './notNull'
import { getSessionId } from './sessionManager'
import timestamp from './timestamp'

/** Returns a new Lexeme without the given context. */
const removeContext = (
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

export default removeContext
