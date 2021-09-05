import { notNull } from './notNull'
import { timestamp } from './timestamp'
import { Lexeme, ThoughtContext, Timestamp } from '../@types'
import { getSessionId } from './sessionManager'

/** Returns a new thought plus the given context. Does not add duplicates. */
export const addContext = (lexeme: Lexeme, rank: number, id: string, archived: Timestamp): Lexeme => ({
  ...lexeme,
  ...notNull({
    contexts: (lexeme.contexts || []).filter((thought: ThoughtContext) => !(id === thought)).concat(id),
    created: lexeme.created || timestamp(),
    lastUpdated: timestamp(),
    updatedBy: getSessionId(),
  }),
})
