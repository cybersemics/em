import { notNull } from './notNull'
import { timestamp } from './timestamp'
import { Lexeme, ThoughtContext, Timestamp } from '../@types'

/** Returns a new thought plus the given context. Does not add duplicates. */
export const addContext = (lexeme: Lexeme, rank: number, id: string, archived: Timestamp): Lexeme => ({
  ...lexeme,
  ...notNull({
    contexts: (lexeme.contexts || [])
      .filter((parent: ThoughtContext) => !(id === parent.id && parent.rank === rank))
      .concat({
        rank,
        id,
        ...(archived ? { archived } : {}),
      }),
    created: lexeme.created || timestamp(),
    lastUpdated: timestamp(),
  }),
})
