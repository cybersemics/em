import Lexeme from '../@types/Lexeme'
import ThoughtContext from '../@types/ThoughtContext'
import ThoughtId from '../@types/ThoughtId'
import Timestamp from '../@types/Timestamp'
import { clientId } from '../data-providers/yjs'
import notNull from './notNull'
import timestamp from './timestamp'

/** Returns a new thought plus the given context. Does not add duplicates. */
const addContext = (lexeme: Lexeme, rank: number, id: ThoughtId, archived: Timestamp): Lexeme => ({
  ...lexeme,
  ...notNull({
    contexts: (lexeme.contexts || []).filter((thought: ThoughtContext) => !(id === thought)).concat(id),
    created: lexeme.created || timestamp(),
    lastUpdated: timestamp(),
    updatedBy: clientId,
  }),
})

export default addContext
