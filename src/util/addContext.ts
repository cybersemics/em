import { equalArrays } from './equalArrays'
import { notNull } from './notNull'
import { timestamp } from './timestamp'
import { getSessionId } from '../util/sessionManager'
import { Context, Lexeme, ThoughtContext, Timestamp } from '../types'

/** Returns a new thought plus the given context. Does not add duplicates. */
export const addContext = (
  lexeme: Lexeme,
  context: Context,
  rank: number,
  id: string | null,
  archived: Timestamp,
): Lexeme => ({
  ...lexeme,
  ...notNull({
    contexts: (lexeme.contexts || [])
      .filter((parent: ThoughtContext) => !(equalArrays(parent.context, context) && parent.rank === rank))
      .concat({
        context,
        rank,
        ...(id ? { id } : null),
        ...(archived ? { archived } : {}),
      }),
    created: lexeme.created || timestamp(),
    lastUpdated: timestamp(),
    updatedBy: getSessionId(),
  }),
})
