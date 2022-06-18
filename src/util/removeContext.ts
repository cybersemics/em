import timestamp from './timestamp'
import notNull from './notNull'
import { getSessionId } from './sessionManager'
import State from '../@types/State'
import Lexeme from '../@types/Lexeme'
import Timestamp from '../@types/Timestamp'

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
