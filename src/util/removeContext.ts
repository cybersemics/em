import Lexeme from '../@types/Lexeme'
import State from '../@types/State'
import Timestamp from '../@types/Timestamp'
import { clientId } from '../data-providers/yjs'
import notNull from './notNull'
import timestamp from './timestamp'

/** Returns a new Lexeme without the given context. */
const removeContext = (
  state: State,
  lexeme: Lexeme,
  thoughtId: string,
  lastUpdated: Timestamp = timestamp(),
): Lexeme => ({
  ...lexeme,
  ...notNull({
    contexts: lexeme.contexts ? lexeme.contexts.filter(id => id !== thoughtId) : [],
    created: lexeme.created || lastUpdated,
    lastUpdated: lastUpdated,
    updatedBy: clientId,
  }),
})

export default removeContext
